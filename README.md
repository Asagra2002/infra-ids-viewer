# Infra IDS Viewer

IDS checker and BCF viewer with GIS, focused on BIM infrastructure models.

## Stack

- React + Vite
- That Open Fragments 3
- Firebase Firestore (project metadata)
- Netlify static hosting

## Preloaded model

- Project document: `rVY8PWGeY7XWl7kQHYrY`
- IFC: `/assets/IFC example/demo-bridge-so201-hameenlinna.ifc`

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
