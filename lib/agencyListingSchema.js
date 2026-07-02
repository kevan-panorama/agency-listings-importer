export const agencyListingFields = {
  agencyName: "",
  agencyContactName: "",
  agencyEmail: "",
  agencyPhone: "",
  sourceUrl: "",

  propertyTitle: "",
  propertyType: "",
  operation: "",
  address: "",
  city: "",
  neighborhood: "",

  bedrooms: "",
  bathrooms: "",
  guestToilets: "",
  surfaceSqm: "",
  plotSqm: "",
  terraceSqm: "",

  price: "",
  commission: "",

  description: "",
  internalNotes: "",

  detectedLinks: [],
  photoLinks: [],
  documentLinks: [],
  missingFields: [],
  confidence: 0,
};

export const requiredCrmFields = [
  "propertyTitle",
  "propertyType",
  "operation",
  "city",
  "neighborhood",
  "bedrooms",
  "bathrooms",
  "surfaceSqm",
  "price",
  "description",
];

export function normalizeAgencyListing(input = {}) {
  const normalized = {};

  for (const key of Object.keys(agencyListingFields)) {
    normalized[key] =
      input[key] !== undefined && input[key] !== null
        ? input[key]
        : agencyListingFields[key];
  }

  if (!Array.isArray(normalized.detectedLinks)) normalized.detectedLinks = [];
  if (!Array.isArray(normalized.photoLinks)) normalized.photoLinks = [];
  if (!Array.isArray(normalized.documentLinks)) normalized.documentLinks = [];
  if (!Array.isArray(normalized.missingFields)) normalized.missingFields = [];

  const confidenceNumber = Number(normalized.confidence);
  normalized.confidence = Number.isFinite(confidenceNumber)
    ? Math.max(0, Math.min(100, confidenceNumber))
    : 0;

  return normalized;
}
