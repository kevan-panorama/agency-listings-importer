"use client";

import { useState } from "react";

export default function Home() {
  const [rawEmail, setRawEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function extractListing() {
    setLoading(true);
    setError("");
    setResult(null);
    setSaveMessage("");

    try {
      const res = await fetch("/api/agency-importer/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rawEmail })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Extraction failed");
      }

      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!result?.listing) return;

    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const res = await fetch("/api/agency-importer/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rawEmail,
          listing: result.listing,
          rawExtractedJson: result.rawExtractedJson
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Save failed");
      }

      setSaveMessage("Draft saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const listing = result?.listing;

  return (
    <main style={{ padding: 40, fontFamily: "Arial", background: "#f5f3ee", minHeight: "100vh" }}>
      <h1>Agency Listings Importer</h1>
      <p>Paste an agency email and extract a CRM-ready listing draft.</p>

      <textarea
        value={rawEmail}
        onChange={(e) => setRawEmail(e.target.value)}
        placeholder="Paste agency email here..."
        style={{
          width: "100%",
          minHeight: 260,
          padding: 16,
          fontSize: 15,
          marginTop: 20,
          borderRadius: 8,
          border: "1px solid #ccc"
        }}
      />

      <button
        onClick={extractListing}
        disabled={loading || !rawEmail.trim()}
        style={{
          marginTop: 16,
          padding: "12px 22px",
          fontSize: 16,
          cursor: "pointer",
          borderRadius: 8,
          border: "none",
          background: "#111",
          color: "#fff"
        }}
      >
        {loading ? "Extracting..." : "Extract Listing"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>
          {error}
        </p>
      )}

      {saveMessage && (
        <p style={{ color: "green", marginTop: 20 }}>
          {saveMessage}
        </p>
      )}

      {listing && (
        <section style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12 }}>
            <h2>Original Email</h2>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>
              {rawEmail}
            </pre>
          </div>

          <div style={{ background: "#fff", padding: 24, borderRadius: 12 }}>
            <h2>Extracted Listing</h2>

            <p><strong>Agency:</strong> {listing.agencyName}</p>
            <p><strong>Contact:</strong> {listing.agencyContactName}</p>
            <p><strong>Email:</strong> {listing.agencyEmail}</p>
            <p><strong>Phone:</strong> {listing.agencyPhone}</p>

            <hr />

            <p><strong>Title:</strong> {listing.propertyTitle}</p>
            <p><strong>Type:</strong> {listing.propertyType}</p>
            <p><strong>Operation:</strong> {listing.operation}</p>
            <p><strong>Address:</strong> {listing.address}</p>
            <p><strong>City:</strong> {listing.city}</p>
            <p><strong>Neighborhood:</strong> {listing.neighborhood}</p>

            <p><strong>Bedrooms:</strong> {listing.bedrooms}</p>
            <p><strong>Bathrooms:</strong> {listing.bathrooms}</p>
            <p><strong>Guest Toilets:</strong> {listing.guestToilets}</p>
            <p><strong>Built:</strong> {listing.surfaceSqm}</p>
            <p><strong>Plot:</strong> {listing.plotSqm}</p>
            <p><strong>Terrace:</strong> {listing.terraceSqm}</p>

            <p><strong>Price:</strong> {listing.price}</p>
            <p><strong>Commission:</strong> {listing.commission}</p>

            <hr />

            <p><strong>Description:</strong></p>
            <p>{listing.description}</p>

            <p><strong>Confidence:</strong> {listing.confidence}%</p>

            <p><strong>Missing Fields:</strong></p>
            <ul>
              {listing.missingFields?.map((field, index) => (
                <li key={index}>{field}</li>
              ))}
            </ul>

            <p><strong>Detected Links:</strong></p>
            <ul>
              {listing.detectedLinks?.map((link, index) => (
                <li key={index}>{link}</li>
              ))}
            </ul>

            <button
              onClick={saveDraft}
              disabled={saving}
              style={{
                marginTop: 20,
                padding: "12px 22px",
                fontSize: 16,
                cursor: "pointer",
                borderRadius: 8,
                border: "none",
                background: "#111",
                color: "#fff"
              }}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
