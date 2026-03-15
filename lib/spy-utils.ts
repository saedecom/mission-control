/**
 * Extract Facebook page ID from an Ad Library URL.
 * Supports formats like:
 * - https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=123456789
 * - https://facebook.com/ads/library/?view_all_page_id=123456789
 */
export function extractPageIdFromUrl(url: string): string | null {
  const match = url.match(/view_all_page_id=(\d+)/)
  return match ? match[1] : null
}

/**
 * Build Ad Library URL from a page ID.
 */
export function buildAdLibraryUrl(pageId: string): string {
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${pageId}`
}

/**
 * Get the Monday of the current week (ISO week start).
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

/**
 * Extract media fingerprint from Facebook CDN URL for dedup.
 */
export function getMediaFingerprint(url: string | null | undefined): string {
  if (!url) return ''
  const match = url.match(/\/(\d{10,}_\d+[^/?\s]*)/)
  if (match) return match[1]
  return url.slice(-150)
}
