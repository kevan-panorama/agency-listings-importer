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

export function extractReadableTextFromHtml(html = "") {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|br|tr|td|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&euro;/g, "€")
    .replace(/&#8364;/g, "€")
    .replace(/&middot;/g, "·")
    .replace(/&#183;/g, "·")
    .replace(/\s+/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
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
      lower.includes("profile?") ||
      lower.includes("preferences") ||
      lower.includes("privacy") ||
      lower.includes("fonts.googleapis") ||
      lower.includes("fonts.gstatic") ||
      lower.includes("list-manage.com") ||
      lower.includes("mailto:") ||
      lower.includes("filelist.xml") ||
      lower.includes("editdata.mso") ||
      lower.includes("themedata.thmx") ||
      lower.includes("colorschememapping.xml")
    ) {
      ignoredLinks.push(link);
      continue;
    }

    if (
      lower.includes("drive.google.com") ||
      lower.includes("dropbox.com") ||
      lower.includes("wetransfer.com")
    ) {
      marketingMaterialLinks.push(link);
      detectedLinks.push(link);
      continue;
    }

    if (
      lower.includes("/show/sale/") ||
      lower.includes("/show/rent/") ||
      lower.includes("property") ||
      lower.includes("apartment-sale") ||
      lower.includes("villa-sale")
    ) {
      propertyLinks.push(link);
      detectedLinks.push(link);
      continue;
    }

    if (
      lower.includes(".jpg") ||
      lower.includes(".jpeg") ||
      lower.includes(".png") ||
      lower.includes(".webp") ||
      lower.includes("mcusercontent.com") ||
      lower.includes("dim.mcusercontent.com")
    ) {
      photoLinks.push(link);
      detectedLinks.push(link);
      continue;
    }

    if (
      lower.includes(".pdf") ||
      lower.includes("brochure") ||
      lower.includes("floorplan") ||
      lower.includes("floor-plan")
    ) {
      documentLinks.push(link);
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
