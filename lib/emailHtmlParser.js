export function extractLinksFromHtml(html = "") {
  const links = new Set();

  const hrefRegex = /href=["']([^"']+)["']/gi;
  const srcRegex = /src=["']([^"']+)["']/gi;

  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    links.add(cleanUrl(match[1]));
  }

  while ((match = srcRegex.exec(html)) !== null) {
    links.add(cleanUrl(match[1]));
  }

  return Array.from(links).filter(Boolean);
}

function cleanUrl(url = "") {
  return url
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

export function classifyLinks(links = []) {
  const detectedLinks = [];
  const photoLinks = [];
  const documentLinks = [];
  const marketingMaterialLinks = [];
  const propertyLinks = [];
  const ignoredLinks = [];

  for (const link of links) {
    const lower = link.toLowerCase();

    if (
      lower.includes("unsubscribe") ||
      lower.includes("preferences") ||
      lower.includes("privacy") ||
      lower.includes("mailto:")
    ) {
      ignoredLinks.push(link);
      continue;
    }

    if (
      lower.includes("drive.google.com") ||
      lower.includes("dropbox.com") ||
      lower.includes("wetransfer.com") ||
      lower.includes("marketing")
    ) {
      marketingMaterialLinks.push(link);
      detectedLinks.push(link);
      continue;
    }

    if (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.includes("gallery") ||
      lower.includes("photos") ||
      lower.includes("pictures")
    ) {
      photoLinks.push(link);
      detectedLinks.push(link);
      continue;
    }

    if (
      lower.endsWith(".pdf") ||
      lower.includes("brochure") ||
      lower.includes("floorplan") ||
      lower.includes("floor-plan")
    ) {
      documentLinks.push(link);
      detectedLinks.push(link);
      continue;
    }

    if (
      lower.includes("property") ||
      lower.includes("sale") ||
      lower.includes("apartment") ||
      lower.includes("villa") ||
      lower.includes("carlingpetri.com")
    ) {
      propertyLinks.push(link);
      detectedLinks.push(link);
      continue;
    }

    detectedLinks.push(link);
  }

  return {
    detectedLinks,
    photoLinks,
    documentLinks,
    marketingMaterialLinks,
    propertyLinks,
    ignoredLinks,
  };
}
