# CulinaryAdmin

Panel del proveedor de Culinary Restaurant. Habla solo con CulinaryServer (`/admin/v1`; contrato en `CulinaryServer/docs/API.md`).

## Desarrollo

```bash
npm install
npm run dev          # http://127.0.0.1:5180
npm test             # Playwright con un CulinaryServer simulado (usa Microsoft Edge)
```

## Compilar las apps

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-windows.ps1          # instalador NSIS en src-tauri/target/release/bundle/nsis
powershell -ExecutionPolicy Bypass -File tools/build-android.ps1 -Release # APK ARM64 firmado en dist-android
```

Ambos scripts toman Rust y MSVC de `../MesaNexoNativo/.tools`. Android necesita JDK 17 (Microsoft OpenJDK), el SDK de Android en `%LOCALAPPDATA%\Android\Sdk` (platform-tools, platforms;android-34, build-tools;34.0.0, ndk;27.2.12479018) y `rustup target add aarch64-linux-android`. Sin el modo de desarrollador de Windows, Tauri no puede crear su enlace simbólico; el script copia la biblioteca y empaqueta con Gradle. El APK se firma con una llave local de prueba en `.signing/` (fuera de git); para distribuirlo en una tienda usa una llave propia.

Contra un worker local: en CulinaryServer crea `.dev.vars` con `ROOT_PRIVATE_KEY`, `ADMIN_SETUP_CODE` y `ADMIN_ORIGINS=http://127.0.0.1:5180`, aplica `npx wrangler d1 migrations apply culinary-server --local` y corre `npx wrangler dev`.

## Producción

- Agrega el origen del panel a `ADMIN_ORIGINS` del worker: `http://tauri.localhost` para la app de escritorio en Windows.
- La primera cuenta se da de alta con `ADMIN_SETUP_CODE`; las demás, con una invitación desde «Equipo y seguridad».
- Cada cuenta vive en un equipo: su llave se crea con WebCrypto y no se puede exportar.
