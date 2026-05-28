# Cello Simulator

Cross-platform cello simulator built with React, Vite, TypeScript, Web Audio, and Tauri.

## Local Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm test
npm run build
npm run tauri -- build --debug
```

## GitHub Actions

The `Build and Deploy` workflow:

- runs unit tests;
- deploys the web build to GitHub Pages from `dist`;
- builds macOS `.dmg` artifacts for x64 and arm64;
- builds a Windows x64 NSIS `.exe` installer.
