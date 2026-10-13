async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const getRows = () => request('/api/rows');

// Rows are addressed by sheet row number; the offer ID guards against the sheet having changed.
export const patchRow = (row, changes) =>
  request(`/api/rows/${row.sheetRow}`, json('PATCH', { offerId: row.offerId, changes }));

export const fulfillRow = (row, payload) =>
  request(`/api/rows/${row.sheetRow}/fulfill`, json('POST', { offerId: row.offerId, ...payload }));

export function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
