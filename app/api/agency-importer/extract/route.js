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
- confidence must be 0 to 100 based on completeness and reliability.

Inmobalia field filling rules:
- Fill every Inmobalia field that can be reasonably mapped from the email or website.
- Do not only fill the basic fields.
- Look for implicit CRM values in the property description.
- Leave fields blank only if there is no reliable evidence.

Main mapping:
- If text says "asking price", "sale", or the property URL contains "/sale/", set main.forSale = true.
- If text mentions bedrooms, bathrooms, built, terrace, plot, interior, parking, pool, garden, orientation, community fees, IBI, garbage tax, levels, floor, renovation, construction year, fill the corresponding main fields.
- If text mentions "exclusive listing", set main.exclusive = true.
- If text mentions "two underground parking spaces", set main.garage = "Underground" and main.parkingSpaces = "2".
- If text mentions "south-facing", set main.orientation = "South".
- If text mentions "south/east" or "south-east", set main.orientation = "South/East".
- If text mentions "communal swimming pool", set main.pool = "Communal".
- If text mentions "private pool", set main.pool = "Private".
- If text mentions "landscaped gardens" or "communal gardens", set main.garden = "Communal".
- If text mentions "private garden", set main.garden = "Private".
- If text mentions "master suite with en-suite bathroom", set main.suiteBaths = "1".
- If text mentions "luxury", "high-end", "premium", or similar, set main.luxury = true only if strongly supported.

Descriptions mapping:
- shortDescription should be a concise CRM title under 120 characters.
- description should be a polished website-ready description.
- extraDescription should include bullet-style highlights when available.
- Fill views booleans when views are mentioned.
- Fill condition when text says renovated, new, excellent condition, good condition, etc.
- Fill features with amenities such as lift, storage room, private terrace, covered terrace, fitted wardrobes, concierge, gym, spa, gated community, underground parking, open-plan kitchen.
- Fill furniture only if furnished/unfurnished is stated.
- Fill rooms when master suite, dressing area, storage room, utility room, office, basement, guest apartment, etc. are stated.
- Fill security when gated community, alarm, 24h security, concierge, secure entrance, etc. are stated.

Images mapping:
- imageUrls should include only likely property photos.
- Exclude logos, icons, social icons, tracking pixels, font assets.
- mainImage should be the first likely property photo.
- imageCount should be the number of useful image URLs detected.

Private mapping:
- seller should be the agency or sender name.
- zone should be the neighborhood/development.
- address should remain empty unless exact address is provided.
- internalNotes should include source, exclusivity, portal restrictions, commission and warnings.

Commission mapping:
- saleCommission should capture percentage, for example "4% + IVA".
- internalComments should explain commission source.

Attachments mapping:
- marketingMaterialFolder should be Google Drive, Dropbox, WeTransfer or marketing material URL.
- brochures/floorplans/energyCertificate should only be filled if clear document links exist.

Legal mapping:
- Only fill legal fields when explicitly present.
- If energy certificate is not provided, leave blank unless text says it is in process.

MLS / Portals mapping:
- If email says "Do not publish it on property portals", set portalRestrictions to that exact restriction.
- In that case, do not enable public portals.
- Web can remain true if material may be used on website.

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

    let finalInmobalia = normalizeInmobalia({
      ...inmobalia,
      images: {
        ...inmobalia.images,
        imageUrls: finalImageUrls,
        sourceEmailImages: emailPhotoLinks.filter(isLikelyUsefulImage),
        sourceWebsiteImages: websitePhotoLinks.filter(isLikelyUsefulImage),
        imageCount: finalImageUrls.length,
        mainImage: inmobalia.images?.mainImage || finalImageUrls[0] || "",
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

    finalInmobalia = enrichInmobaliaFromText(
      finalInmobalia,
      combinedReadableText,
      mergedListing,
      finalImageUrls
    );

    brainLog.push("6. Compared email and website data");
    brainLog.push("7. Produced Inmobalia-ready draft");
    brainLog.push("8. Applied deterministic Inmobalia enrichment rules");
    brainLog.push("9. Prepared result for UI and Supabase saving");

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

function enrichInmobaliaFromText(inmobalia, text, listing, imageUrls) {
  const t = text.toLowerCase();

  const enriched = normalizeInmobalia(inmobalia);

  enriched.main.type = enriched.main.type || listing.propertyType || "";
  enriched.main.location =
    enriched.main.location ||
    [listing.neighborhood, listing.city].filter(Boolean).join(", ");
  enriched.main.forSale =
    enriched.main.forSale ||
    listing.operation === "Sale" ||
    /asking price|for sale|\/sale\//i.test(text);
  enriched.main.salePrice = enriched.main.salePrice || listing.price || "";
  enriched.main.bedrooms = enriched.main.bedrooms || listing.bedrooms || "";
  enriched.main.bathrooms = enriched.main.bathrooms || listing.bathrooms || "";
  enriched.main.toilets = enriched.main.toilets || listing.guestToilets || "";
  enriched.main.built = enriched.main.built || listing.surfaceSqm || "";
  enriched.main.plot = enriched.main.plot || listing.plotSqm || "";
  enriched.main.terrace = enriched.main.terrace || listing.terraceSqm || "";

  if (/exclusive listing|exclusive/i.test(text)) enriched.main.exclusive = true;
  if (/luxury|high-end|premium/i.test(text)) enriched.main.luxury = true;

  if (/communal swimming pool|community pool|communal pool/.test(t)) {
    enriched.main.pool = enriched.main.pool || "Communal";
  }
  if (/private swimming pool|private pool/.test(t)) {
    enriched.main.pool = enriched.main.pool || "Private";
  }
  if (/landscaped gardens|communal gardens|community gardens/.test(t)) {
    enriched.main.garden = enriched.main.garden || "Communal";
  }
  if (/private garden/.test(t)) {
    enriched.main.garden = enriched.main.garden || "Private";
  }
  if (/underground parking/.test(t)) {
    enriched.main.garage = enriched.main.garage || "Underground";
  }
  if (/garage/.test(t)) {
    enriched.main.garage = enriched.main.garage || "Garage";
  }

  const parkingMatch = text.match(/(\d+|one|two|three|four)\s+(underground\s+)?parking spaces?/i);
  if (parkingMatch && !enriched.main.parkingSpaces) {
    enriched.main.parkingSpaces = wordNumberToDigit(parkingMatch[1]);
  }

  if (/south-facing|south facing/.test(t)) {
    enriched.main.orientation = enriched.main.orientation || "South";
  }
  if (/south-east|southeast|south\/east/.test(t)) {
    enriched.main.orientation = enriched.main.orientation || "South/East";
  }
  if (/south-west|southwest|south\/west/.test(t)) {
    enriched.main.orientation = enriched.main.orientation || "South/West";
  }

  if (/en-suite|ensuite/.test(t)) {
    enriched.main.suiteBaths = enriched.main.suiteBaths || "1";
  }

  enriched.descriptions.shortDescription =
    enriched.descriptions.shortDescription || listing.propertyTitle || "";
  enriched.descriptions.description =
    enriched.descriptions.description || listing.description || "";

  if (/country view/.test(t)) enriched.descriptions.views.country = true;
  if (/golf view|golf views/.test(t)) enriched.descriptions.views.golf = true;
  if (/marina view/.test(t)) enriched.descriptions.views.marina = true;
  if (/panoramic view|panoramic views/.test(t)) enriched.descriptions.views.panoramic = true;
  if (/pool view/.test(t)) enriched.descriptions.views.pool = true;
  if (/street view/.test(t)) enriched.descriptions.views.street = true;
  if (/garden view|garden views/.test(t)) enriched.descriptions.views.garden = true;
  if (/lake view/.test(t)) enriched.descriptions.views.lake = true;
  if (/mountain view|mountain views/.test(t)) enriched.descriptions.views.mountain = true;
  if (/partial sea view|partial sea views/.test(t)) enriched.descriptions.views.partialSea = true;
  if (/sea view|sea views/.test(t)) enriched.descriptions.views.sea = true;
  if (/urban view/.test(t)) enriched.descriptions.views.urban = true;

  addIfMentioned(enriched.descriptions.features, t, "Private terrace", /private terrace/);
  addIfMentioned(enriched.descriptions.features, t, "Covered terrace", /covered terrace/);
  addIfMentioned(enriched.descriptions.features, t, "Storage room", /storage room/);
  addIfMentioned(enriched.descriptions.features, t, "Fitted wardrobes", /fitted wardrobes/);
  addIfMentioned(enriched.descriptions.features, t, "Concierge service", /concierge/);
  addIfMentioned(enriched.descriptions.features, t, "Underground parking", /underground parking/);
  addIfMentioned(enriched.descriptions.features, t, "Open-plan kitchen", /open-plan|open plan/);
  addIfMentioned(enriched.descriptions.features, t, "Fully fitted kitchen", /fully fitted.*kitchen|fitted contemporary kitchen/);
  addIfMentioned(enriched.descriptions.features, t, "Breakfast bar", /breakfast bar/);
  addIfMentioned(enriched.descriptions.features, t, "Floor-to-ceiling windows", /floor-to-ceiling|floor to ceiling/);
  addIfMentioned(enriched.descriptions.features, t, "Gated community", /gated community/);

  addIfMentioned(enriched.descriptions.rooms, t, "Master suite", /master suite/);
  addIfMentioned(enriched.descriptions.rooms, t, "Dressing area", /dressing area|dressing room/);
  addIfMentioned(enriched.descriptions.rooms, t, "Storage room", /storage room/);

  addIfMentioned(enriched.descriptions.security, t, "Gated community", /gated community/);
  addIfMentioned(enriched.descriptions.security, t, "Concierge service", /concierge/);
  addIfMentioned(enriched.descriptions.security, t, "Secure community", /secure gated|secure community/);

  addIfMentioned(enriched.descriptions.condition, t, "Excellent condition", /excellent condition/);
  addIfMentioned(enriched.descriptions.condition, t, "Recently renovated", /renovated|refurbished/);
  addIfMentioned(enriched.descriptions.condition, t, "New development", /new development|brand new/);

  if (/fully furnished/.test(t)) {
    addUnique(enriched.descriptions.furniture, "Fully furnished");
  }
  if (/unfurnished/.test(t)) {
    addUnique(enriched.descriptions.furniture, "Unfurnished");
  }

  enriched.images.imageUrls = unique([
    ...(enriched.images.imageUrls || []),
    ...(imageUrls || []),
  ]).filter(isLikelyUsefulImage);
  enriched.images.imageCount = enriched.images.imageUrls.length;
  enriched.images.mainImage =
    enriched.images.mainImage || enriched.images.imageUrls[0] || "";

  enriched.private.seller =
    enriched.private.seller || listing.agencyName || "";
  enriched.private.zone =
    enriched.private.zone || listing.neighborhood || "";
  enriched.private.address =
    enriched.private.address || listing.address || "";
  enriched.private.internalNotes = uniqueText([
    enriched.private.internalNotes,
    listing.internalNotes,
  ]);

  enriched.commission.saleCommission =
    enriched.commission.saleCommission || listing.commission || "";
  enriched.commission.internalComments =
    enriched.commission.internalComments ||
    (listing.commission ? `Commission detected from source: ${listing.commission}` : "");

  if (/do not publish.*property portals|do not publish it on property portals/i.test(text)) {
    enriched.mlsPortals.portalRestrictions =
      enriched.mlsPortals.portalRestrictions ||
      "Do not publish it on property portals.";
    enriched.mlsPortals.portalsFeeds.allPortalsFeeds = false;
    enriched.mlsPortals.portalsFeeds.web = true;
    enriched.mlsPortals.cloneWebPermission = "all_agencies_no";
  }

  return normalizeInmobalia(enriched);
}

function addIfMentioned(array, text, value, regex) {
  if (regex.test(text)) addUnique(array, value);
}

function addUnique(array, value) {
  if (!Array.isArray(array)) return;
  if (!array.includes(value)) array.push(value);
}

function uniqueText(parts = []) {
  return parts.filter(Boolean).join("\n").trim();
}

function wordNumberToDigit(value = "") {
  const lower = String(value).toLowerCase();

  const map = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
  };

  return map[lower] || String(value);
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
