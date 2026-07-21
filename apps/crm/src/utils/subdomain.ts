// Reserved subdomains that don't represent a tenant.
const RESERVED = new Set(['www', 'app', 'admin', 'api', 'mail', 'ftp', 'dev', 'staging']);

/**
 * Returns the tenant slug from the hostname when running on a wildcard subdomain
 * (e.g. "fg" from "fg.yourapp.uz").  Returns null in dev (localhost) or on the
 * root / reserved subdomain.
 */
export function getTenantSlug(): string | null {
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  const parts = hostname.split('.');
  if (parts.length < 3) return null; // root domain or single-label host

  const sub = parts[0].toLowerCase();
  if (RESERVED.has(sub)) return null;

  return sub;
}
