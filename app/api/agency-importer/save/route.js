import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeAgencyListing } from "@/lib/agencyListingSchema";
import { normalizeInmobalia } from "@/lib/inmobaliaSchema";

export async function POST(req) {
  try {
    const body = await req.json();

    const rawEmail = body.rawEmail || "";
    const rawHtml = body.rawHtml || "";
    const rawExtractedJson = body.rawExtractedJson || null;

    const listing = normalizeAgencyListing(body.listing || {});
    const inmobalia = normalizeInmobalia(body.inmobalia || {});

    const sourceLinks = body.sourceLinks || {};
    const websiteVerification = body.websiteVerification || {};
    const importedImages = body.importedImages || [];
    const importedAttachments = body.importedAttachments || [];
    const verificationNotes = body.verificationNotes || [];
    const importBrainLog = body.importBrainLog || [];
    const missingFields = body.missingFields || listing.missingFields || [];

    if (!rawEmail.trim() && !rawHtml.trim()) {
      return NextResponse.json(
        { error: "Missing raw email or HTML content" },
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
        raw_email: rawEmail || rawHtml,

        raw_extracted_json: rawExtractedJson,
        listing_json: listing,

        panorama_description: listing.description,
        confidence: listing.confidence,
        missing_fields: missingFields,
        detected_links: listing.detectedLinks,
        photo_links: listing.photoLinks,
        document_links: listing.documentLinks,

        inmobalia_main: inmobalia.main,
        inmobalia_descriptions: inmobalia.descriptions,
        inmobalia_images: inmobalia.images,
        inmobalia_private: inmobalia.private,
        inmobalia_commission: inmobalia.commission,
        inmobalia_attachments: inmobalia.attachments,
        inmobalia_legal: inmobalia.legal,
        inmobalia_mls_portals: inmobalia.mlsPortals,

        source_links: sourceLinks,
        website_verification: websiteVerification,
        imported_images: importedImages,
        imported_attachments: importedAttachments,
        verification_notes: verificationNotes,
        import_brain_log: importBrainLog,
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
