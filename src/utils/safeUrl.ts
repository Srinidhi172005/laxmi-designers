// Guard against `javascript:` / `data:` URI injection.
//
// React escapes text content but does NOT sanitise the `href`/`src` attribute,
// so a stored value like `javascript:fetch(...)` would execute in a visitor's
// session. Every URL that comes from the database (store settings, video URLs,
// banner links) is passed through here before being rendered or saved.

/** Returns the URL if it is a safe http(s) link, otherwise undefined. */
export function safeHttpUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

/** Same as safeHttpUrl but also allows blob:/data: — for local media previews. */
export function safeMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  if (/^(blob:|data:)/i.test(trimmed)) return trimmed;
  return safeHttpUrl(trimmed);
}

/** True when the value is a usable http(s) URL — for validating admin input. */
export function isValidHttpUrl(url: string): boolean {
  return safeHttpUrl(url) !== undefined;
}

/** Build a `tel:` href from a free-text phone number, stripping unsafe chars. */
export function telHref(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const cleaned = String(phone).replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : undefined;
}
