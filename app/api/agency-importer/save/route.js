import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeAgencyListing } from "@/lib/agencyListingSchema";

export async function POST(req) {
  try {
    const body = await req.json();

    const rawEmail = body.rawEmail || "";
    const rawExtractedJson = body.rawExtractedJson || null;
    const listing = normalizeAgencyListing(body.listing || {});

    if (!rawEmail.trim()) {
      return NextResponse.json(
        { error: "Missing raw email content" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("agency_imports")
      .insert({
        status: "draft",

        agency_name: listing.agencyName,
        agency_contact_name: listing.agencyContactName,
        agency_email: listing.agencyEmail,

        source_url: listing.sourceUrl,
        raw_email: rawEmail,

        raw_extracted_json: rawExtractedJson,
        listing_json: listing,

        panorama_description: listing.description,
        confidence: listing.confidence,
        missing_fields: listing.missingFields,
        detected_links: listing.detectedLinks,
        photo_links: listing.photoLinks,
        document_links: listing.documentLinks,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to save agency import",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      import: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Save agency import failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
