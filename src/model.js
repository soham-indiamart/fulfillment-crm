export const RAG = { red: 'Red', amber: 'Amber', green: 'Green' };

// 0 = Red, up to 4 = Amber, above 4 = Green.
export function ragOf(score) {
  const n = Number(score) || 0;
  if (n <= 0) return 'red';
  if (n <= 4) return 'amber';
  return 'green';
}

export const glAdminUrl = (offerId) =>
  `https://gladmin.intermesh.net/nodev2/buylead/buylead-search?offer=${encodeURIComponent(offerId)}&mid=3424`;

// GL Admin only allows framing from https://*.indiamart.com (X-Frame-Options /
// frame-ancestors); anywhere else it opens in its own window instead.
export const canEmbedGlAdmin = () =>
  window.location.protocol === 'https:' && /(^|\.)indiamart\.com$/.test(window.location.hostname);

export function fileLabel(url) {
  const name = decodeURIComponent(String(url).split('/').pop() || '');
  return name.replace(/^\d+-\d+-/, '') || 'Quotation';
}

export function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
