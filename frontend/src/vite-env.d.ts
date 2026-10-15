/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin for a separate API domain, e.g. https://api.example.com. Empty: same origin. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
