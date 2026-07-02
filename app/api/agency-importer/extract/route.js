import { NextResponse } from "next/server";
import {
  normalizeAgencyListing,
  requiredCrmFields,
} from "@/lib/agencyListingSchema";
import {
  extractLinksFromHtml,
  classifyLinks,
  extractReadableTextFromHtml,
} from "@/lib/emailHtmlParser";
import {
  normalizeInmobalia,
  mapListingToInmobalia,
} from "@/lib/inmobaliaSchema";

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const rawEmail = body.rawEmail || body.email || "";
    const rawHtml = body.rawHtml || "";

    if (!rawEmail.trim() && !rawHtml.trim()) {
      return NextResponse.json(
        { error: "Missing agency email content or HTML" },
        { status: 400 }
      );
    }

    const brainLog = [];

    brainLog.push("1. Read email HTML and visible text");

    const emailHtmlLinks = rawHtml ? extractLinksFromHtml(rawHtml) : [];
    const classifiedEmailLinks = classifyLinks(emailHtmlLinks);

    const readableHtmlText = rawHtml
      ? extractReadableTextFromHtml(rawHtml)
      : "";

    brainLog.push("2. Extracted visible text and hidden links from email HTML");

    const firstPropertyUrl =
      classifiedEmailLinks.propertyLinks?.[0] ||
      classifiedEmailLinks.detectedLinks?.find((link) =>
        /property|\/show\/sale\/|\/show\/rent\/|apartment|villa/i.test(link)
      ) ||
      "";

    const firstMarketingUrl =
      classifiedEmailLinks.marketingMaterialLinks?.[0] || "";

    brainLog.push("3. Identified property page and marketing material links");

    let websiteData = {
      url: firstPropertyUrl,
      crawled: false,
      readableText: "",
      links: [],
      classifiedLinks: emptyClassifiedLinks(),
      error: "",
    };

    if (firstPropertyUrl) {
      websiteData = await crawlWebsite(firstPropertyUrl);
      brainLog.push("4. Crawled property website");
    } else {
      brainLog.push("4. No property website found to crawl");
    }

    brainLog.push("5. Detected gallery/photos and website links");

    const sourceLinks = {
      propertyUrl: firstPropertyUrl,
      marketingMaterialUrl: firstMarketingUrl,
      emailLinks: classifiedEmailLinks,
      websiteLinks: websiteData.classifiedLinks,
    };

    const combinedReadableText = `
VISIBLE EMAIL TEXT:
${rawEmail}

READABLE TEXT EXTRACTED FROM EMAIL HTML:
${readableHtmlText}

READABLE TEXT EXTRACTED FROM PROPERTY WEBSITE:
${websiteData.readableText}
`.trim();

    const prompt = `
You are Panorama's Agency Listings Importer.

Your job is to read an agency listing email, check the property website data if available, and produce a CRM-ready Inmobalia draft.

Workflow you must follow:
1. Read the visible email text and email HTML text.
2. Use hidden email links to identify the property page and marketing material.
3. Use the crawled website text to verify property facts.
4. Compare email facts with website facts.
5. Produce a normalized listing object.
6. Produce an Inmobalia-ready draft with these sections:
   - main
   - descriptions
   - images
   - private
   - commission
   - attachments
   - legal
   - mlsPortals
7. Identify missing fields.
8. Add verification notes.

Rules:
- Return only valid JSON.
- Do not wrap the JSON in markdown.
- Ignore invisible characters, tracking text, footer text, unsubscribe text, copyright footer, social links, font links, and Mailchimp tracking links.
- Do not invent exact address, cadastral reference, GPS, seller private info, legal data, or documents.
- Extract only information that is present or strongly implied.
- Use website data to verify email data.
- If email and website disagree, keep the most reliable value and add a verification note.
- Keep numeric fields as strings, for example "3", "250", "690000".
- Convert prices such as "690.000 €" into "690000".
- Convert areas such as "123 SQM BUILT" into "123".
- If commission says "4% + IVA", store exactly "4% + IVA".
- If the email says "do not publish on property portals", add that to internal notes and MLS/portal restrictions.
- If it says "exclusive listing", mark exclusive true where appropriate.
- operation should usually be "Sale" if there is an asking price and no rental language.
- propertyType should be normalized: Apartment, Villa, Townhouse, Penthouse, Plot.
- sourceUrl should be the most likely property page URL.
- image URLs should include likely real property photos, not icons, logos, social icons, or tracking pixels.
- For Inmobalia images, use sourceEmailImages and sourceWebsiteImages if images are detected.
- For Inmobalia attachments, include Drive/Dropbox/WeTransfer links as marketingMaterialFolder if detected.
- For MLS/Portals, if there is a restriction "do not publish on property portals", set portalRestrictions and avoid enabling public portals.
- confidence must be 0 to 100 based on completeness and reliability.

Important CRM fields:
${requiredCrmFields.join(", ")}

Return exactly this JSON structure:
{
  "listing": {
    "agencyName": "",
    "agencyContactName": "",
    "agencyEmail": "",
    "agencyPhone": "",
    "sourceUrl": "",
    "propertyTitle": "",
    "propertyType": "",
    "operation": "",
    "address": "",
    "city": "",
    "neighborhood": "",
    "bedrooms": "",
    "bathrooms": "",
    "guestToilets": "",
    "surfaceSqm": "",
    "plotSqm": "",
    "terraceSqm": "",
    "price": "",
    "commission": "",
    "description": "",
    "internalNotes": "",
    "detectedLinks": [],
    "photoLinks": [],
    "documentLinks": [],
    "missingFields": [],
    "confidence": 0
  },
  "inmobalia": {
    "main": {},
    "descriptions": {},
    "images": {},
    "private": {},
    "commission": {},
    "attachments": {},
    "legal": {},
    "mlsPortals": {}
  },
  "missingFields": [],
  "verificationNotes": []
}

Source links and classified links:
${JSON.stringify(sourceLinks, null, 2)}

Clean readable content:
${combinedReadableText.slice(0, 45000)}
`;

    const openAiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        text: {
          format: {
            type: "json_object",
          },
        },
      }),
    });

    const openAiJson = await openAiRes.json();

    if (!openAiRes.ok) {
      return NextResponse.json(
        {
          error: "OpenAI extraction failed",
          details: openAiJson,
        },
        { status: 500 }
      );
    }

    const outputText =
      openAiJson.output_text ||
      openAiJson.output?.[0]?.content?.[0]?.text ||
      "";

    if (!outputText) {
      return NextResponse.json(
        {
          error: "OpenAI returned no extractable text",
          details: openAiJson,
        },
        { status: 500 }
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "OpenAI returned invalid JSON",
          details: parseError.message,
          outputText,
        },
        { status: 500 }
      );
    }

    const listing = normalizeAgencyListing(parsed.listing || {});
    const mappedFromListing = mapListingToInmobalia(listing);
    const inmobalia = normalizeInmobalia({
      ...mappedFromListing,
      ...(parsed.inmobalia || {}),
    });

    const emailPhotoLinks = classifiedEmailLinks.photoLinks || [];
    const websitePhotoLinks = websiteData.classifiedLinks.photoLinks || [];

    const mergedListing = {
      ...listing,
      sourceUrl: listing.sourceUrl || firstPropertyUrl,
      detectedLinks: unique([
        ...(listing.detectedLinks || []),
        ...(classifiedEmailLinks.detectedLinks || []),
        ...(websiteData.classifiedLinks.detectedLinks || []),
      ]),
      photoLinks: unique([
        ...(listing.photoLinks || []),
        ...emailPhotoLinks,
        ...websitePhotoLinks,
      ]).filter(isLikelyUsefulImage),
      documentLinks: unique([
        ...(listing.documentLinks || []),
        ...(classifiedEmailLinks.documentLinks || []),
        ...(websiteData.classifiedLinks.documentLinks || []),
      ]),
    };

    const finalImageUrls = unique([
      ...(inmobalia.images?.imageUrls || []),
      ...mergedListing.photoLinks,
    ]).filter(isLikelyUsefulImage);

    const finalInmobalia = normalizeInmobalia({
      ...inmobalia,
      images: {
        ...inmobalia.images,
        imageUrls: finalImageUrls,
        sourceEmailImages: emailPhotoLinks.filter(isLikelyUsefulImage),
        sourceWebsiteImages: websitePhotoLinks.filter(isLikelyUsefulImage),
        imageCount: finalImageUrls.length,
        sourceGalleryUrl:
          inmobalia.images?.sourceGalleryUrl ||
          websiteData.classifiedLinks.photoLinks?.[0] ||
          "",
      },
      attachments: {
        ...inmobalia.attachments,
        marketingMaterialFolder:
          inmobalia.attachments?.marketingMaterialFolder ||
          firstMarketingUrl ||
          "",
        links: unique([
          ...(inmobalia.attachments?.links || []),
          ...mergedListing.detectedLinks,
        ]),
      },
    });

    brainLog.push("6. Compared email and website data");
    brainLog.push("7. Produced Inmobalia-ready draft");
    brainLog.push("8. Prepared result for UI and Supabase saving");

    return NextResponse.json({
      success: true,
      listing: mergedListing,
      inmobalia: finalInmobalia,
      sourceLinks,
      websiteVerification: {
        crawled: websiteData.crawled,
        url: websiteData.url,
        error: websiteData.error,
        readableTextPreview: websiteData.readableText.slice(0, 3000),
      },
      importedImages: finalInmobalia.images.imageUrls || [],
      importedAttachments: finalInmobalia.attachments.links || [],
      verificationNotes: parsed.verificationNotes || [],
      missingFields: parsed.missingFields || mergedListing.missingFields || [],
      importBrainLog: brainLog,
      htmlLinks: classifiedEmailLinks,
      readableHtmlTextPreview: readableHtmlText.slice(0, 3000),
      rawExtractedJson: parsed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Agency listing extraction failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function crawlWebsite(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PanoramaAgencyImporter/1.0)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        url,
        crawled: false,
        readableText: "",
        links: [],
        classifiedLinks: emptyClassifiedLinks(),
        error: `Website fetch failed with status ${res.status}`,
      };
    }

    const html = await res.text();
    const links = extractLinksFromHtml(html);
    const classifiedLinks = classifyLinks(links);
    const readableText = extractReadableTextFromHtml(html);

    return {
      url,
      crawled: true,
      readableText,
      links,
      classifiedLinks,
      error: "",
    };
  } catch (error) {
    return {
      url,
      crawled: false,
      readableText: "",
      links: [],
      classifiedLinks: emptyClassifiedLinks(),
      error: error.message,
    };
  }
}

function emptyClassifiedLinks() {
  return {
    detectedLinks: [],
    photoLinks: [],
    documentLinks: [],
    marketingMaterialLinks: [],
    propertyLinks: [],
    ignoredLinks: [],
  };
}

function unique(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

function isLikelyUsefulImage(url = "") {
  const lower = url.toLowerCase();

  if (
    lower.includes("facebook-icon") ||
    lower.includes("instagram-icon") ||
    lower.includes("website-icon") ||
    lower.includes("brand-assets.mailchimp") ||
    lower.includes("logo") ||
    lower.includes("icon")
  ) {
    return false;
  }

  return (
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".webp") ||
    lower.includes("dim.mcusercontent.com") ||
    lower.includes("mcusercontent.com")
  );
}
