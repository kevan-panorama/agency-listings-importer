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

    const htmlLinks = rawHtml ? extractLinksFromHtml(rawHtml) : [];
    const classifiedHtmlLinks = classifyLinks(htmlLinks);

    const readableHtmlText = rawHtml
      ? extractReadableTextFromHtml(rawHtml)
      : "";

    const combinedReadableText = `
VISIBLE EMAIL TEXT:
${rawEmail}

READABLE TEXT EXTRACTED FROM HTML:
${readableHtmlText}
`.trim();

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        agencyName: { type: "string" },
        agencyContactName: { type: "string" },
        agencyEmail: { type: "string" },
        agencyPhone: { type: "string" },
        sourceUrl: { type: "string" },

        propertyTitle: { type: "string" },
        propertyType: { type: "string" },
        operation: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        neighborhood: { type: "string" },

        bedrooms: { type: "string" },
        bathrooms: { type: "string" },
        guestToilets: { type: "string" },
        surfaceSqm: { type: "string" },
        plotSqm: { type: "string" },
        terraceSqm: { type: "string" },

        price: { type: "string" },
        commission: { type: "string" },

        description: { type: "string" },
        internalNotes: { type: "string" },

        detectedLinks: {
          type: "array",
          items: { type: "string" },
        },
        photoLinks: {
          type: "array",
          items: { type: "string" },
        },
        documentLinks: {
          type: "array",
          items: { type: "string" },
        },
        missingFields: {
          type: "array",
          items: { type: "string" },
        },
        confidence: { type: "number" },
      },
      required: [
        "agencyName",
        "agencyContactName",
        "agencyEmail",
        "agencyPhone",
        "sourceUrl",
        "propertyTitle",
        "propertyType",
        "operation",
        "address",
        "city",
        "neighborhood",
        "bedrooms",
        "bathrooms",
        "guestToilets",
        "surfaceSqm",
        "plotSqm",
        "terraceSqm",
        "price",
        "commission",
        "description",
        "internalNotes",
        "detectedLinks",
        "photoLinks",
        "documentLinks",
        "missingFields",
        "confidence",
      ],
    };

    const prompt = `
You are Panorama's Agency Listings Importer.

Your job is to read an agency email and extract a CRM-ready property listing draft.

Rules:
- This may be a real estate newsletter email with hidden characters, tracking text, footer text, unsubscribe text, copyright text, and button links.
- Ignore invisible characters, repeated blank symbols, unsubscribe text, update preferences text, copyright footer, social media links, font links, tracking links, and generic marketing footer content.
- Focus only on the property listing content, subject line, sender, contact details, commission, usage restrictions, URLs, and property facts.
- Use both the visible email text and the clean readable text extracted from the email HTML.
- Hidden button links from the email HTML are very important.
- Prioritize links classified as marketingMaterialLinks and propertyLinks.
- Extract only information that is present or strongly implied.
- If a field is not available, return an empty string.
- Keep numeric fields as strings, for example "3", "250", "690000".
- Convert prices such as "690.000 €" into "690000".
- Convert areas such as "123 SQM BUILT" into "123".
- Convert terrace areas such as "38 SQM TERRACE" into "38".
- If the subject or body mentions "4% FOR YOU", "4% + IVA commission", or similar, set commission to the most precise commission text, for example "4% + IVA".
- If the email says "do not publish on property portals", include this in internalNotes.
- If it says "exclusive listing", include that in internalNotes.
- Put general property or agency URLs in detectedLinks.
- Put image/photo URLs in photoLinks only if clearly photo/image links.
- Put PDF/document/brochure/floorplan URLs in documentLinks.
- Write the description in a polished Panorama real estate style.
- Do not invent exact address, price, bedrooms, bathrooms, or surface.
- Do not use social icons, Mailchimp tracking links, unsubscribe links, font URLs, or agency homepages as the main sourceUrl.
- sourceUrl should be the most likely property page URL.
- missingFields should include important CRM fields that are missing.
- confidence must be 0 to 100 based on completeness and reliability.

For Panorama:
- operation should usually be "Sale" if there is an asking price and no rental language.
- propertyType should be normalized, for example "Apartment", "Villa", "Townhouse", "Penthouse", "Plot".
- neighborhood can be a development or area such as "Higuerón West III".
- city should be inferred only when very likely from the text. If municipality is unclear, leave it empty rather than guessing.
- internalNotes should include commission, exclusivity, publishing restrictions, source warnings, and anything important for the team.

Important CRM fields:
${requiredCrmFields.join(", ")}

Links extracted and classified from original email HTML:
${JSON.stringify(classifiedHtmlLinks, null, 2)}

Clean readable email content:
${combinedReadableText.slice(0, 35000)}
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
            type: "json_schema",
            name: "agency_listing_import",
            strict: true,
            schema,
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

    const parsed = JSON.parse(outputText);
    const listing = normalizeAgencyListing(parsed);

    const mergedListing = {
      ...listing,
      detectedLinks: Array.from(
        new Set([
          ...(listing.detectedLinks || []),
          ...classifiedHtmlLinks.detectedLinks,
        ])
      ),
      photoLinks: Array.from(
        new Set([
          ...(listing.photoLinks || []),
          ...classifiedHtmlLinks.photoLinks,
        ])
      ),
      documentLinks: Array.from(
        new Set([
          ...(listing.documentLinks || []),
          ...classifiedHtmlLinks.documentLinks,
        ])
      ),
    };

    return NextResponse.json({
      success: true,
      listing: mergedListing,
      htmlLinks: classifiedHtmlLinks,
      readableHtmlTextPreview: readableHtmlText.slice(0, 5000),
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
