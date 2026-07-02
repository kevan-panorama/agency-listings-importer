"use client";

import { useRef, useState } from "react";

const tabs = [
  "Main",
  "Descriptions",
  "Images",
  "Private",
  "Commission",
  "Attachments",
  "Legal",
  "MLS / Portals",
  "Brain",
];

export default function Home() {
  const fileInputRef = useRef(null);

  const [rawEmail, setRawEmail] = useState("");
  const [rawHtml, setRawHtml] = useState("");
  const [htmlFileName, setHtmlFileName] = useState("");
  const [isDraggingHtml, setIsDraggingHtml] = useState(false);

  const [activeTab, setActiveTab] = useState("Main");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function readHtmlFile(file) {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isValid =
      lowerName.endsWith(".html") ||
      lowerName.endsWith(".htm") ||
      lowerName.endsWith(".txt");

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
    readHtmlFile(event.target.files?.[0]);
  }

  function handleHtmlDrop(event) {
    event.preventDefault();
    setIsDraggingHtml(false);
    readHtmlFile(event.dataTransfer.files?.[0]);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDraggingHtml(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDraggingHtml(false);
  }

  function clearHtmlFile() {
    setRawHtml("");
    setHtmlFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function extractListing() {
    setLoading(true);
    setError("");
    setResult(null);
    setSaveMessage("");
    setActiveTab("Main");

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
          inmobalia: result.inmobalia,
          sourceLinks: result.sourceLinks,
          websiteVerification: result.websiteVerification,
          importedImages: result.importedImages,
          importedAttachments: result.importedAttachments,
          verificationNotes: result.verificationNotes,
          importBrainLog: result.importBrainLog,
          missingFields: result.missingFields,
          rawExtractedJson: result.rawExtractedJson,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Save failed");
      }

      setSaveMessage("Draft saved successfully in Supabase.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const canExtract = rawEmail.trim() || rawHtml.trim();
  const listing = result?.listing;
  const inmobalia = result?.inmobalia;

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>Panorama Internal Tool</p>
            <h1 style={{ margin: "8px 0" }}>Agency Listings Importer</h1>
            <p style={{ margin: 0, color: "#555", maxWidth: 900 }}>
              Import agency emails, extract hidden links, verify property data
              from websites and prepare an Inmobalia-ready draft.
            </p>
          </div>

          {result && (
            <button
              onClick={saveDraft}
              disabled={saving}
              style={{
                ...primaryButtonStyle,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
          )}
        </header>

        <section style={inputGridStyle}>
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
                minHeight: 300,
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            />
          </Panel>

          <Panel title="2. Original Email HTML">
            <p style={helperTextStyle}>
              Drag and drop the saved HTML email file, click to choose it from
              your computer, or paste the HTML manually.
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
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleHtmlDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                width: "100%",
                padding: "30px 20px",
                borderRadius: 14,
                border: isDraggingHtml ? "2px solid #111" : "2px dashed #aaa",
                background: isDraggingHtml ? "#eee9df" : "#fafafa",
                cursor: "pointer",
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              <strong style={{ fontSize: 16 }}>
                {isDraggingHtml ? "Drop the HTML file here" : "Drop HTML file here"}
              </strong>
              <br />
              <span style={{ color: "#666", fontSize: 14 }}>
                or click to choose a file from your computer
              </span>
            </button>

            {htmlFileName && (
              <div style={loadedFileStyle}>
                <span>
                  Loaded: <strong>{htmlFileName}</strong> ·{" "}
                  {rawHtml.length.toLocaleString()} characters
                </span>
                <button type="button" onClick={clearHtmlFile} style={smallButtonStyle}>
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
                minHeight: 180,
                fontFamily: "monospace",
                fontSize: 13,
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
              cursor: loading || !canExtract ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Extracting & Crawling..." : "Extract Listing"}
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
            <strong>Importer brain running...</strong>
            <p style={{ marginBottom: 0, color: "#666" }}>
              Reading email HTML, extracting hidden links, crawling property
              page, checking photos and preparing Inmobalia sections.
            </p>
          </div>
        )}

        {result && listing && inmobalia && (
          <section style={{ marginTop: 36 }}>
            <SummaryCards result={result} />

            <div style={resultLayoutStyle}>
              <Panel title="Source & Verification">
                <Field label="Agency" value={listing.agencyName} />
                <Field label="Contact" value={listing.agencyContactName} />
                <Field label="Email" value={listing.agencyEmail} />
                <Field label="Phone" value={listing.agencyPhone} />
                <Field label="Property URL" value={listing.sourceUrl} />
                <Field
                  label="Website crawled"
                  value={result.websiteVerification?.crawled ? "Yes" : "No"}
                />
                {result.websiteVerification?.error && (
                  <Field
                    label="Website error"
                    value={result.websiteVerification.error}
                  />
                )}

                <h3>Verification Notes</h3>
                <SimpleList items={result.verificationNotes} />

                <h3>Missing Fields</h3>
                <SimpleList items={result.missingFields} />

                <h3>Property Links</h3>
                <LinkList links={result.sourceLinks?.emailLinks?.propertyLinks} />

                <h3>Marketing Material Links</h3>
                <LinkList
                  links={result.sourceLinks?.emailLinks?.marketingMaterialLinks}
                />
              </Panel>

              <div>
                <div style={tabsStyle}>
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        ...tabButtonStyle,
                        background: activeTab === tab ? "#111" : "#fff",
                        color: activeTab === tab ? "#fff" : "#111",
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <Panel title={`Inmobalia: ${activeTab}`}>
                  {activeTab === "Main" && <MainTab data={inmobalia.main} />}
                  {activeTab === "Descriptions" && (
                    <DescriptionsTab data={inmobalia.descriptions} />
                  )}
                  {activeTab === "Images" && (
                    <ImagesTab data={inmobalia.images} images={result.importedImages} />
                  )}
                  {activeTab === "Private" && (
                    <PrivateTab data={inmobalia.private} />
                  )}
                  {activeTab === "Commission" && (
                    <CommissionTab data={inmobalia.commission} />
                  )}
                  {activeTab === "Attachments" && (
                    <AttachmentsTab
                      data={inmobalia.attachments}
                      attachments={result.importedAttachments}
                    />
                  )}
                  {activeTab === "Legal" && <LegalTab data={inmobalia.legal} />}
                  {activeTab === "MLS / Portals" && (
                    <MlsTab data={inmobalia.mlsPortals} />
                  )}
                  {activeTab === "Brain" && <BrainTab result={result} />}
                </Panel>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCards({ result }) {
  const listing = result.listing;
  const images = result.importedImages || [];

  return (
    <div style={summaryGridStyle}>
      <MiniCard label="Title" value={listing.propertyTitle || "—"} />
      <MiniCard label="Price" value={listing.price ? `${listing.price} €` : "—"} />
      <MiniCard
        label="Beds / Baths"
        value={`${listing.bedrooms || "—"} / ${listing.bathrooms || "—"}`}
      />
      <MiniCard label="Images detected" value={images.length} />
      <MiniCard label="Confidence" value={`${listing.confidence || 0}%`} />
    </div>
  );
}

function MainTab({ data }) {
  return (
    <Grid>
      <Field label="Reference" value={data.reference} />
      <Field label="Type" value={data.type} />
      <Field label="Development" value={data.development} />
      <Field label="Location" value={data.location} />
      <Field label="For sale" value={yesNo(data.forSale)} />
      <Field label="Sale price" value={data.salePrice} />
      <Field label="Bedrooms" value={data.bedrooms} />
      <Field label="Bathrooms" value={data.bathrooms} />
      <Field label="Toilets" value={data.toilets} />
      <Field label="Suite baths" value={data.suiteBaths} />
      <Field label="Built" value={data.built} />
      <Field label="Plot" value={data.plot} />
      <Field label="Terrace" value={data.terrace} />
      <Field label="Interior" value={data.interior} />
      <Field label="Pool" value={data.pool} />
      <Field label="Garden" value={data.garden} />
      <Field label="Garage" value={data.garage} />
      <Field label="Orientation" value={data.orientation} />
      <Field label="Community fees" value={data.communityFees} />
      <Field label="IBI" value={data.ibi} />
      <Field label="Garbage tax" value={data.garbageTax} />
      <Field label="Exclusive" value={yesNo(data.exclusive)} />
      <Field label="Luxury" value={yesNo(data.luxury)} />
      <Field label="Direct" value={yesNo(data.direct)} />
    </Grid>
  );
}

function DescriptionsTab({ data }) {
  return (
    <>
      <Field label="Language" value={data.language} />
      <TextBlock label="Short description" value={data.shortDescription} />
      <TextBlock label="Description" value={data.description} />
      <TextBlock label="Price description" value={data.priceDescription} />
      <TextBlock label="Extra description" value={data.extraDescription} />

      <h3>Views</h3>
      <Grid>
        {Object.entries(data.views || {}).map(([key, value]) => (
          <Field key={key} label={key} value={yesNo(value)} />
        ))}
      </Grid>

      <h3>Features</h3>
      <SimpleList items={data.features} />
    </>
  );
}

function ImagesTab({ data, images }) {
  return (
    <>
      <Field label="Image count" value={data.imageCount || images?.length || 0} />
      <Field label="Main image" value={data.mainImage} />
      <Field label="Gallery URL" value={data.sourceGalleryUrl} />

      <h3>Detected Images</h3>
      <ImageGrid images={images || data.imageUrls || []} />
    </>
  );
}

function PrivateTab({ data }) {
  return (
    <Grid>
      <Field label="Seller" value={data.seller} />
      <Field label="Listed by" value={data.listedBy} />
      <Field label="GPS" value={data.gpsCoordinates} />
      <Field label="Cadastral reference" value={data.cadastralReference} />
      <Field label="Postcode" value={data.postcode} />
      <Field label="Zone" value={data.zone} />
      <Field label="Address" value={data.address} />
      <Field label="Visiting conditions" value={data.visitingConditions} />
      <Field label="Key status" value={data.keyStatus} />
      <Field label="Sale boards" value={yesNo(data.saleBoards)} />
      <Field label="Keys" value={yesNo(data.keys)} />
      <Field label="Internal notes" value={data.internalNotes} />
    </Grid>
  );
}

function CommissionTab({ data }) {
  return (
    <Grid>
      <Field label="Sale commission" value={data.saleCommission} />
      <Field label="Internal comments" value={data.internalComments} />
      <Field label="Network commission total" value={data.networkCommissionTotal} />
      <Field label="Network commission split" value={data.networkCommissionSplit} />
      <Field label="Own commission total" value={data.ownCommissionTotal} />
      <Field label="Own commission split" value={data.ownCommissionSplit} />
      <Field label="Public comments" value={data.publicComments} />
    </Grid>
  );
}

function AttachmentsTab({ data, attachments }) {
  return (
    <>
      <Field label="Marketing folder" value={data.marketingMaterialFolder} />
      <Field label="Drive folder" value={data.driveFolder} />
      <Field label="Dropbox folder" value={data.dropboxFolder} />

      <h3>Detected Attachment / Source Links</h3>
      <LinkList links={attachments || data.links} />
    </>
  );
}

function LegalTab({ data }) {
  return (
    <Grid>
      <Field
        label="Energy certification in process"
        value={yesNo(data.energyCertificationInProcess)}
      />
      <Field label="Cert consumption" value={data.certConsumption} />
      <Field label="Consumption" value={data.consumption} />
      <Field label="Cert emission" value={data.certEmission} />
      <Field label="Emission" value={data.emission} />
      <Field label="Touristic code" value={data.touristicCode} />
      <Field label="Rateable value" value={data.rateableValue} />
      <Field label="Property registry" value={data.propertyRegistry} />
      <Field label="Copy nota simple" value={yesNo(data.copyNotaSimple)} />
      <Field label="Copy IBI bills" value={yesNo(data.copyIbiBills)} />
      <Field label="Copy plans" value={yesNo(data.copyPlans)} />
      <Field label="Agency agreement" value={yesNo(data.agencyAgreement)} />
    </Grid>
  );
}

function MlsTab({ data }) {
  return (
    <>
      <Grid>
        <Field label="Shared sales" value={yesNo(data.inmobaliaSharedSales)} />
        <Field label="Shared rent" value={yesNo(data.inmobaliaSharedRent)} />
        <Field label="Clone/web permission" value={data.cloneWebPermission} />
        <Field label="Portal restrictions" value={data.portalRestrictions} />
      </Grid>

      <h3>Portals / Feeds</h3>
      <Grid>
        {Object.entries(data.portalsFeeds || {}).map(([key, value]) => (
          <Field key={key} label={key} value={yesNo(value)} />
        ))}
      </Grid>
    </>
  );
}

function BrainTab({ result }) {
  return (
    <>
      <h3>Brain Workflow</h3>
      <SimpleList items={result.importBrainLog} />

      <h3>Website Verification</h3>
      <pre style={preStyle}>
        {JSON.stringify(result.websiteVerification, null, 2)}
      </pre>

      <h3>Readable HTML Preview</h3>
      <pre style={preStyle}>{result.readableHtmlTextPreview}</pre>
    </>
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

function Grid({ children }) {
  return <div style={fieldGridStyle}>{children}</div>;
}

function Field({ label, value }) {
  return (
    <div style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <span style={fieldValueStyle}>{value || "—"}</span>
    </div>
  );
}

function TextBlock({ label, value }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <strong>{label}</strong>
      <div style={textBlockStyle}>{value || "—"}</div>
    </div>
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

function ImageGrid({ images }) {
  if (!images || images.length === 0) {
    return <p style={{ color: "#777" }}>No images detected yet.</p>;
  }

  return (
    <div style={imageGridStyle}>
      {images.slice(0, 30).map((url, index) => (
        <a key={index} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="" style={imageStyle} />
        </a>
      ))}
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div style={miniCardStyle}>
      <span style={{ color: "#777", fontSize: 13 }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

const pageStyle = {
  padding: 40,
  fontFamily: "Arial, Helvetica, sans-serif",
  background: "#f5f3ee",
  minHeight: "100vh",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  marginBottom: 28,
};

const eyebrowStyle = {
  margin: 0,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  color: "#777",
};

const inputGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24,
};

const resultLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "360px 1fr",
  gap: 24,
  alignItems: "start",
  marginTop: 24,
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 14,
};

const miniCardStyle = {
  background: "#fff",
  border: "1px solid #e0ddd5",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const panelStyle = {
  background: "#fff",
  padding: 24,
  borderRadius: 14,
  border: "1px solid #e0ddd5",
};

const helperTextStyle = {
  color: "#666",
  fontSize: 14,
  lineHeight: 1.5,
};

const textareaStyle = {
  width: "100%",
  padding: 16,
  fontSize: 14,
  borderRadius: 8,
  border: "1px solid #ccc",
  resize: "vertical",
};

const loadedFileStyle = {
  background: "#f0f7ef",
  color: "#236423",
  border: "1px solid #cfe8ce",
  padding: "10px 12px",
  borderRadius: 8,
  marginBottom: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const primaryButtonStyle = {
  padding: "14px 26px",
  fontSize: 16,
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "14px 22px",
  fontSize: 16,
  borderRadius: 8,
  border: "1px solid #bbb",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
};

const smallButtonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #aaa",
  background: "#fff",
  cursor: "pointer",
};

const tabsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 14,
};

const tabButtonStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #bbb",
  cursor: "pointer",
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const fieldStyle = {
  border: "1px solid #e2e2e2",
  borderRadius: 8,
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const fieldLabelStyle = {
  color: "#777",
  fontSize: 12,
};

const fieldValueStyle = {
  color: "#111",
  fontSize: 14,
  wordBreak: "break-word",
};

const textBlockStyle = {
  marginTop: 8,
  background: "#f7f7f7",
  padding: 14,
  borderRadius: 8,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
};

const imageGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
};

const imageStyle = {
  width: "100%",
  height: 150,
  objectFit: "cover",
  borderRadius: 8,
  border: "1px solid #ddd",
};

const preStyle = {
  background: "#111",
  color: "#0f0",
  padding: 16,
  borderRadius: 8,
  whiteSpace: "pre-wrap",
  maxHeight: 350,
  overflow: "auto",
};
