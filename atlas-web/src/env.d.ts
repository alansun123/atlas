/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_BASE_URL?: string
  readonly VITE_ENABLE_MOCK_LOGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
