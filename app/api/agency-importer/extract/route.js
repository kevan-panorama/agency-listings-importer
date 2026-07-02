import { NextResponse } from "next/server";
import {
  normalizeAgencyListing,
  requiredCrmFields,
} from "@/lib/agencyListingSchema";

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

    if (!rawEmail.trim()) {
      return NextResponse.json(
        { error: "Missing agency email content" },
        { status: 400 }
      );
    }

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
        "confidence"
      ],
    };

    const prompt = `
You are Panorama's Agency Listings Importer.

Your job is to read an agency email and extract a CRM-ready property listing draft.

Rules:
- Extract only information that is present or strongly implied.
- If a field is not available, return an empty string.
- Keep numeric fields as strings, for example "3", "250", "1250000".
- Detect all URLs in the email.
- Put general property or agency URLs in detectedLinks.
- Put image/photo URLs in photoLinks only if clearly photo/image links.
- Put PDF/document/brochure/floorplan URLs in documentLinks.
- Write the description in a polished Panorama real estate style.
- Do not invent exact location, price, bedrooms, bathrooms, or surface.
- missingFields should include important CRM fields that are missing.
- confidence must be 0 to 100 based on completeness and reliability.

Important CRM fields:
${requiredCrmFields.join(", ")}

Agency email:
${rawEmail}
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

    return NextResponse.json({
      success: true,
      listing,
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
