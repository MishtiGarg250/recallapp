export type ExtractedMetadata = { title: string; description: string; domain: string; previewImage?: string };

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web page";
  }
}

function metaValue(html: string, name: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`, "i");
  return (html.match(pattern)?.[1] ?? html.match(reverse)?.[1] ?? "").replace(/&amp;/g, "&").trim();
}

async function imageAsDataUri(imageUrl: string) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function extractMetadata(url: string): Promise<ExtractedMetadata> {
  const domain = getDomain(url);
  try {
    const response = await fetch(url, { headers: { Accept: "text/html" } });
    const html = await response.text();
    const title = metaValue(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || domain;
    const description = metaValue(html, "og:description") || metaValue(html, "description");
    const imageUrl = metaValue(html, "og:image");
    const previewImage = imageUrl ? await imageAsDataUri(new URL(imageUrl, url).toString()) : undefined;
    return { title, description, domain, previewImage };
  } catch {
    return { title: domain, description: "", domain };
  }
}

// Match a hostname label like "example", "co", "my-site". No whitespace, no punctuation.
const HOSTNAME_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Paste a link to continue.");
  if (/\s/.test(trimmed)) throw new Error("That does not look like a valid link.");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("That does not look like a valid link.");
  }
  const host = parsed.hostname;
  if (!host) throw new Error("That does not look like a valid link.");
  const labels = host.split(".");
  if (labels.length < 2 || labels.some((label) => !HOSTNAME_LABEL.test(label))) {
    throw new Error("That does not look like a valid link.");
  }
  return parsed.toString();
}
