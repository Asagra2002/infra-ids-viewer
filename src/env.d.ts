/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_API_KEY: string
    readonly VITE_CO2DATA_API_KEY: string
    readonly VITE_RTS_API_KEY: string
    readonly VITE_VTT_API_KEY: string
    readonly VITE_MAANMITTLAITOS_API_KEY?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
} 