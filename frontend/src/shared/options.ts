// Shared contract. Source of truth: backend/src/shared. The frontend keeps an identical copy in
// frontend/src/shared; refresh it from frontend/ with `npm run sync:shared` (CI checks they match).
// Dropdown values, shared by the dashboard and the server's validation.
export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROGRESS = [
  'No seller found',
  'No quotations found',
  'Product not found',
  'Evaluating multi quotation',
  'Fulfilled',
] as const;
export type Progress = (typeof PROGRESS)[number];
