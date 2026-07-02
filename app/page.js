"use client";

import { useState } from "react";

export default function Home() {
  const [rawEmail, setRawEmail] = useState("");
  const [rawHtml, setRawHtml] = useState("");
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawEmail,
          rawHtml,
        }),
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawEmail,
          rawHtml,
          listing: result.listing,
          rawExtractedJson: result.rawExtractedJson,
        }),
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

  async function handleHtmlFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setRawHtml(text);
  }

  const listing = result?.listing;
  const htmlLinks = result?.htmlLinks;

  return (
    <main
      style={{
        padding: 40,
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "#f5f3ee",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>Agency Listings Importer</h1>
        <p style={{ marginTop: 0, color: "#555" }}>
          Paste the visible email text and upload or paste the original email
          HTML to detect hidden buttons, property links and marketing material.
        </p>

        <section
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 14,
              border: "1px solid #e0ddd5",
            }}
          >
            <h2 style={{ marginTop: 0 }}>1. Visible Email Text</h2>
            <p style={{ color: "#666", fontSize: 14 }}>
              Paste the copied email body from Outlook here.
            </p>

            <textarea
              value={rawEmail}
              onChange={(e) => setRawEmail(e.target.value)}
              placeholder="Paste visible agency email text here..."
              style={{
                width: "100%",
                minHeight: 320,
                padding: 16,
                fontSize: 14,
                borderRadius: 8,
                border: "1px solid #ccc",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 14,
              border: "1px solid #e0ddd5",
            }}
          >
            <h2 style={{ marginTop: 0 }}>2. Original Email HTML</h2>
            <p style={{ color: "#666", fontSize: 14 }}>
              Upload a saved .html email file, or paste the HTML source here.
              This helps detect hidden links behind buttons and images.
            </p>

            <input
              type="file"
              accept=".html,.htm,.txt"
              onChange={handleHtmlFileUpload}
              style={{
                display: "block",
                marginBottom: 14,
              }}
            />

            <textarea
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              placeholder="Paste original email HTML here, or upload an .html file..."
              style={{
                width: "100%",
                minHeight: 280,
                padding: 16,
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid #ccc",
                resize: "vertical",
                fontFamily: "monospace",
              }}
            />
          </div>
        </section>

        <button
          onClick={extractListing}
          disabled={loading || (!rawEmail.trim() && !rawHtml.trim())}
          style={{
            marginTop: 22,
            padding: "14px 26px",
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            borderRadius: 8,
            border: "none",
            background: "#111",
            color: "#fff",
            opacity: loading || (!rawEmail.trim() && !rawHtml.trim()) ? 0.6 : 1,
          }}
        >
          {loading ? "Extracting..." : "Extract Listing"}
        </button>

        {error && (
          <p style={{ color: "red", marginTop: 20 }}>
            <strong>Error:</strong> {error}
          </p>
        )}

        {saveMessage && (
          <p style={{ color: "green", marginTop: 20 }}>
            <strong>{saveMessage}</strong>
          </p>
        )}

        {listing && (
          <section
            style={{
              marginTop: 36,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 14,
                border: "1px solid #e0ddd5",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Source Review</h2>

              <h3>Visible Email</h3>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  background: "#f7f7f7",
                  padding: 16,
                  borderRadius: 8,
                  maxHeight: 280,
                  overflow: "auto",
                }}
              >
                {rawEmail || "No visible email text provided."}
              </pre>

              <h3>Detected HTML Links</h3>

              <p>
                <strong>Property Links:</strong>
              </p>
              <LinkList links={htmlLinks?.propertyLinks} />

              <p>
                <strong>Marketing Material Links:</strong>
              </p>
              <LinkList links={htmlLinks?.marketingMaterialLinks} />

              <p>
                <strong>Photo Links:</strong>
              </p>
              <LinkList links={htmlLinks?.photoLinks} />

              <p>
                <strong>Document Links:</strong>
              </p>
              <LinkList links={htmlLinks?.documentLinks} />

              <p>
                <strong>Ignored Links:</strong>
              </p>
              <LinkList links={htmlLinks?.ignoredLinks} />
            </div>

            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 14,
                border: "1px solid #e0ddd5",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Extracted Listing</h2>

              <Field label="Agency" value={listing.agencyName} />
              <Field label="Contact" value={listing.agencyContactName} />
              <Field label="Email" value={listing.agencyEmail} />
              <Field label="Phone" value={listing.agencyPhone} />

              <hr />

              <Field label="Title" value={listing.propertyTitle} />
              <Field label="Type" value={listing.propertyType} />
              <Field label="Operation" value={listing.operation} />
              <Field label="Source URL" value={listing.sourceUrl} />
              <Field label="Address" value={listing.address} />
              <Field label="City" value={listing.city} />
              <Field label="Neighborhood" value={listing.neighborhood} />

              <Field label="Bedrooms" value={listing.bedrooms} />
              <Field label="Bathrooms" value={listing.bathrooms} />
              <Field label="Guest Toilets" value={listing.guestToilets} />
              <Field label="Built sqm" value={listing.surfaceSqm} />
              <Field label="Plot sqm" value={listing.plotSqm} />
              <Field label="Terrace sqm" value={listing.terraceSqm} />

              <Field label="Price" value={listing.price} />
              <Field label="Commission" value={listing.commission} />

              <hr />

              <p>
                <strong>Description:</strong>
              </p>
              <p style={{ lineHeight: 1.6 }}>
                {listing.description || "No description extracted."}
              </p>

              <p>
                <strong>Internal Notes:</strong>
              </p>
              <p style={{ lineHeight: 1.6 }}>
                {listing.internalNotes || "No internal notes."}
              </p>

              <Field label="Confidence" value={`${listing.confidence}%`} />

              <p>
                <strong>Missing Fields:</strong>
              </p>
              <SimpleList items={listing.missingFields} />

              <p>
                <strong>All Detected Links:</strong>
              </p>
              <LinkList links={listing.detectedLinks} />

              <button
                onClick={saveDraft}
                disabled={saving}
                style={{
                  marginTop: 24,
                  padding: "14px 26px",
                  fontSize: 16,
                  cursor: saving ? "not-allowed" : "pointer",
                  borderRadius: 8,
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Field({ label, value }) {
  return (
    <p style={{ margin: "8px 0" }}>
      <strong>{label}:</strong> {value || "—"}
    </p>
  );
}

function SimpleList({ items }) {
  if (!items || items.length === 0) {
    return <p style={{ color: "#777" }}>None</p>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function LinkList({ links }) {
  if (!links || links.length === 0) {
    return <p style={{ color: "#777" }}>None detected</p>;
  }

  return (
    <ul style={{ paddingLeft: 18 }}>
      {links.map((link, index) => (
        <li key={index} style={{ marginBottom: 8, wordBreak: "break-all" }}>
          <a href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        </li>
      ))}
    </ul>
  );
}
