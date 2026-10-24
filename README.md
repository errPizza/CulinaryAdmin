# CulinaryAdmin

Panel del proveedor de Culinary Restaurant. Habla solo con CulinaryServer (`/admin/v1`; contrato en `CulinaryServer/docs/API.md`).

## Desarrollo

```bash
npm install
npm run dev          # http://127.0.0.1:5180
npm test             # Playwright con un CulinaryServer simulado (usa Microsoft Edge)
npm run tauri build  # instalador de Windows
```

Contra un worker local: en CulinaryServer crea `.dev.vars` con `ROOT_PRIVATE_KEY`, `ADMIN_SETUP_CODE` y `ADMIN_ORIGINS=http://127.0.0.1:5180`, aplica `npx wrangler d1 migrations apply culinary-server --local` y corre `npx wrangler dev`.

## Producción

- Agrega el origen del panel a `ADMIN_ORIGINS` del worker: `http://tauri.localhost` para la app de escritorio en Windows.
- La primera cuenta se da de alta con `ADMIN_SETUP_CODE`; las demás, con una invitación desde «Equipo y seguridad».
- Cada cuenta vive en un equipo: su llave se crea con WebCrypto y no se puede exportar.
