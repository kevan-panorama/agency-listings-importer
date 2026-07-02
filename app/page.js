"use client";

import { useRef, useState } from "react";

export default function Home() {
  const fileInputRef = useRef(null);

  const [rawEmail, setRawEmail] = useState("");
  const [rawHtml, setRawHtml] = useState("");
  const [htmlFileName, setHtmlFileName] = useState("");
  const [isDraggingHtml, setIsDraggingHtml] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function readHtmlFile(file) {
    if (!file) return;

    const validExtensions = [".html", ".htm", ".txt"];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      setError("Please upload an .html, .htm or .txt file.");
      return;
    }

    const text = await file.text();
    setRawHtml(text);
    setHtmlFileName(file.name);
    setError("");
  }

  function handleHtmlFileUpload(event) {
    const file = event.target.files?.[0];
    readHtmlFile(file);
  }

  function handleHtmlDrop(event) {
    event.preventDefault();
    setIsDraggingHtml(false);

    const file = event.dataTransfer.files?.[0];
    readHtmlFile(file);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDraggingHtml(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDraggingHtml(false);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function clearHtmlFile() {
    setRawHtml("");
    setHtmlFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

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
        body: JSON.stringify({
          rawEmail,
          rawHtml
        })
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
          rawHtml,
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
  const htmlLinks = result?.htmlLinks;
  const canExtract = rawEmail.trim() || rawHtml.trim();

  return (
    <main
      style={{
        padding: 40,
        fontFamily: "Arial, Helvetica, sans-serif",
        background: "#f5f3ee",
        minHeight: "100vh"
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#777"
            }}
          >
            Panorama Internal Tool
          </p>
          <h1 style={{ margin: "8px 0 8px" }}>Agency Listings Importer</h1>
          <p style={{ margin: 0, color: "#555", maxWidth: 900 }}>
            Paste the visible email text and upload the original email HTML to
            detect hidden buttons, property links, marketing material folders,
            photos and documents.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24
          }}
        >
          <Panel title="1. Visible Email Text">
            <p style={helperTextStyle}>
              Paste the copied body of the agency email from Outlook here.
            </p>

            <textarea
              value={rawEmail}
              onChange={(e) => setRawEmail(e.target.value)}
              placeholder="Paste visible agency email text here..."
              style={{
                ...textareaStyle,
                minHeight: 360,
                fontFamily: "Arial, Helvetica, sans-serif"
              }}
            />
          </Panel>

          <Panel title="2. Original Email HTML">
            <p style={helperTextStyle}>
              Drag and drop the saved HTML email file, click to choose it from
              your computer, or paste the HTML source manually.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,.txt"
              onChange={handleHtmlFileUpload}
              style={{ display: "none" }}
            />

            <button
              type="button"
              onClick={openFilePicker}
              onDrop={handleHtmlDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                width: "100%",
                padding: "34px 20px",
                borderRadius: 14,
                border: isDraggingHtml ? "2px solid #111" : "2px dashed #aaa",
                background: isDraggingHtml ? "#eee9df" : "#fafafa",
                cursor: "pointer",
                textAlign: "center",
                marginBottom: 14
              }}
            >
              <strong style={{ fontSize: 16 }}>
                {isDraggingHtml
                  ? "Drop the HTML file here"
                  : "Drop HTML file here"}
              </strong>
              <br />
              <span style={{ color: "#666", fontSize: 14 }}>
                or click to choose a file from your computer
              </span>
              <br />
              <span style={{ color: "#888", fontSize: 12 }}>
                Accepted: .html, .htm, .txt
              </span>
            </button>

            {htmlFileName && (
              <div
                style={{
                  background: "#f0f7ef",
                  color: "#236423",
                  border: "1px solid #cfe8ce",
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center"
                }}
              >
                <span>
                  Loaded: <strong>{htmlFileName}</strong> ·{" "}
                  {rawHtml.length.toLocaleString()} characters
                </span>
                <button
                  type="button"
                  onClick={clearHtmlFile}
                  style={smallButtonStyle}
                >
                  Clear
                </button>
              </div>
            )}

            <textarea
              value={rawHtml}
              onChange={(e) => {
                setRawHtml(e.target.value);
                if (!e.target.value) setHtmlFileName("");
              }}
              placeholder="Paste original email HTML here, or upload an .html file..."
              style={{
                ...textareaStyle,
                minHeight: 220,
                fontFamily: "monospace",
                fontSize: 13
              }}
            />
          </Panel>
        </section>

        <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
          <button
            onClick={extractListing}
            disabled={loading || !canExtract}
            style={{
              ...primaryButtonStyle,
              opacity: loading || !canExtract ? 0.6 : 1,
              cursor: loading || !canExtract ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Extracting..." : "Extract Listing"}
          </button>

          {result && (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setSaveMessage("");
                setError("");
              }}
              style={secondaryButtonStyle}
            >
              Clear Result
            </button>
          )}
        </div>

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

        {loading && (
          <div style={{ ...panelStyle, marginTop: 28 }}>
            <strong>Extracting listing draft...</strong>
            <p style={{ marginBottom: 0, color: "#666" }}>
              Reading visible text, scanning HTML links, and preparing a
              CRM-ready listing.
            </p>
          </div>
        )}

        {listing && (
          <section
            style={{
              marginTop: 36,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              alignItems: "start"
            }}
          >
            <Panel title="Source Review">
              <h3>Visible Email</h3>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  background: "#f7f7f7",
                  padding: 16,
                  borderRadius: 8,
                  maxHeight: 280,
                  overflow: "auto"
                }}
              >
                {rawEmail || "No visible email text provided."}
              </pre>

              <h3>Detected HTML Links</h3>

              <LinkSection
                title="Property Links"
                links={htmlLinks?.propertyLinks}
              />
              <LinkSection
                title="Marketing Material Links"
                links={htmlLinks?.marketingMaterialLinks}
              />
              <LinkSection title="Photo Links" links={htmlLinks?.photoLinks} />
              <LinkSection
                title="Document Links"
                links={htmlLinks?.documentLinks}
              />
              <LinkSection
                title="Ignored Links"
                links={htmlLinks?.ignoredLinks}
              />
            </Panel>

            <Panel title="Extracted Listing">
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
                  ...primaryButtonStyle,
                  marginTop: 24,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? "not-allowed" : "pointer"
                }}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </Panel>
          </section>
        )}
      </div>
    </main>
  );
}

function Panel({ title, children }) {
  return (
    <div style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <p style={{ margin: "8px 0" }}>
      <strong>{label}:</strong> {value || "—"}
    </p>
  );
}

function LinkSection({ title, links }) {
  return (
    <>
      <p>
        <strong>{title}:</strong>
      </p>
      <LinkList links={links} />
    </>
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

const panelStyle = {
  background: "#fff",
  padding: 24,
  borderRadius: 14,
  border: "1px solid #e0ddd5"
};

const helperTextStyle = {
  color: "#666",
  fontSize: 14,
  lineHeight: 1.5
};

const textareaStyle = {
  width: "100%",
  padding: 16,
  fontSize: 14,
  borderRadius: 8,
  border: "1px solid #ccc",
  resize: "vertical"
};

const primaryButtonStyle = {
  padding: "14px 26px",
  fontSize: 16,
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff"
};

const secondaryButtonStyle = {
  padding: "14px 22px",
  fontSize: 16,
  borderRadius: 8,
  border: "1px solid #bbb",
  background: "#fff",
  color: "#111",
  cursor: "pointer"
};

const smallButtonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #aaa",
  background: "#fff",
  cursor: "pointer"
};
