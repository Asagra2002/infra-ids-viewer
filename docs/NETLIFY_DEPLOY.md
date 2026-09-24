# Deploy Infra IDS Viewer on Netlify

## Site

- Suggested site name: `bsoto-ids-bcf`
- Repository: https://github.com/Asagra2002/infra-ids-viewer

## Build settings

| Field | Value |
|-------|-------|
| Branch | `main` |
| Build command | `npm ci --legacy-peer-deps && npm run build` |
| Publish directory | `dist` |

`netlify.toml` already defines build and SPA redirects.

## Firebase

Uses Firestore project `infra-ids-viewer` (not the legacy demo database).

## Note

MCP and local WebSocket tools are not required for the Netlify static app.
