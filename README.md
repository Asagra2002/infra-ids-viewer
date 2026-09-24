# Infra IDS Viewer

IDS checker and BCF viewer with GIS, focused on BIM infrastructure models.

## Stack

- React + Vite
- That Open Fragments 3
- Firebase Firestore (project metadata)
- Netlify static hosting

## Projects (Firestore)

- `rVY8PWGeY7XWl7kQHYrY` — Hämeenlinna Bridge SO201 (preloaded IFC)
- `QvKlmWCe9jk6rQofY3VI` — upload your own IFC (no `ifcFilePath`)

Preloaded path: `/assets/IFC example/demo-bridge-so201-hameenlinna.ifc`

## Local development

```bash
npm ci --legacy-peer-deps
npm run dev
```

## Build

```bash
npm ci --legacy-peer-deps
npm run build
```

Publish directory for Netlify: `dist`.
