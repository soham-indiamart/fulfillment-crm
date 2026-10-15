export const RAG = { red: 'Red', amber: 'Amber', green: 'Green' } as const;
export type Rag = keyof typeof RAG;

/** 0 = Red, up to 4 = Amber, above 4 = Green. */
export function ragOf(score: number): Rag {
  const n = Number(score) || 0;
  if (n <= 0) return 'red';
  if (n <= 4) return 'amber';
  return 'green';
}

export const glAdminUrl = (offerId: string) =>
  `https://gladmin.intermesh.net/nodev2/buylead/buylead-search?offer=${encodeURIComponent(offerId)}&mid=3424`;

/**
 * GL Admin only allows framing from https://*.indiamart.com (X-Frame-Options / frame-ancestors);
 * anywhere else it opens in its own window instead.
 */
export const canEmbedGlAdmin = () =>
  window.location.protocol === 'https:' && /(^|\.)indiamart\.com$/.test(window.location.hostname);

/** The original file name inside a stored upload URL (`<offer>-<time>-<id>-<name>`). */
export function fileLabel(url: string) {
  const name = decodeURIComponent(url.split('/').pop() ?? '');
  return name.replace(/^\d+-\d+-(?:[0-9a-f]{8}-)?/, '') || 'Quotation';
}
