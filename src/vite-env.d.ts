/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Finnhub WS token — client-exposed by design (low-sensitivity, rate-limited). */
  readonly VITE_FINNHUB_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
