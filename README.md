# artifacts (Frontend)

Lightweight React + Vite frontend for managing S3 artifacts (files & folders).

## Quick start

1. Install
```sh
npm install
```

2. Dev
```sh
npm run dev
```

3. Build
```sh
npm run build
```

4. Preview
```sh
npm run preview
```

## Environment

Copy and edit `.env`:
- [`.env`][.env]

Default API base: VITE_API_BASE_URL (see [.env][.env]).

## Project structure (high level)

- [package.json][package.json]
- [vite.config.js][vite.config.js]
- [tailwind.config.js][tailwind.config.js]
- [src/main.jsx][src/main.jsx]
- [src/App.jsx][src/App.jsx]
- [src/index.css][src/index.css]

Core functionality lives in `src/components`:
- Files UI: [src/components/files/FileList.jsx][src/components/files/FileList.jsx] — [`FileList`][src/components/files/FileList.jsx]
- Upload UI: [src/components/UploadArtifact.jsx][src/components/UploadArtifact.jsx] — [`UploadArtifact`][src/components/UploadArtifact.jsx]
- Sharing: [src/components/common/ShareModal.jsx][src/components/common/ShareModal.jsx] — [`ShareModal`][src/components/common/ShareModal.jsx]
- Preview: [src/components/common/FilePreviewModal.jsx][src/components/common/FilePreviewModal.jsx] — [`FilePreviewModal`][src/components/common/FilePreviewModal.jsx]
- Modals & small components:
  - [src/components/common/Modal.jsx][src/components/common/Modal.jsx] — `Modal` (default)
  - [src/components/common/InputModal.jsx][src/components/common/InputModal.jsx]
  - [src/components/common/Toast.jsx][src/components/common/Toast.jsx]

Utilities:
- [src/utils/idMapping.js][src/utils/idMapping.js] — [`encodeId`][src/utils/idMapping.js], [`decodeId`][src/utils/idMapping.js]
- [src/utils/fileScanner.js][src/utils/fileScanner.js] — [`getFilesFromEvent`][src/utils/fileScanner.js]
- [src/lib/utils.js][src/lib/utils.js] — [`cn`][src/lib/utils.js]

UI primitives:
- Button: [src/components/ui/button.jsx][src/components/ui/button.jsx] — [`Button`][src/components/ui/button.jsx], [`buttonVariants`][src/components/ui/button.jsx]
- Select / Dialog / Dropdown etc: under [src/components/ui/](src/components/ui)

Theme:
- [src/components/theme-provider.jsx][src/components/theme-provider.jsx] — [`ThemeProvider`][src/components/theme-provider.jsx], [`useTheme`][src/components/theme-provider.jsx]

## How it works (short)

- File listing, preview, share, delete, restore, and pagination are implemented in [src/components/files/FileList.jsx][src/components/files/FileList.jsx].
- Uploads use presigned URLs and XHR in [src/components/UploadArtifact.jsx][src/components/UploadArtifact.jsx].
- Folder drag/drop scanning uses the FileSystemEntry API in [src/utils/fileScanner.js][src/utils/fileScanner.js].
- ID encoding for share links uses local mapping in [src/utils/idMapping.js][src/utils/idMapping.js].

## Useful scripts & config

- Dev server: `npm run dev` (configured in [vite.config.js][vite.config.js])
- Tailwind is configured in [tailwind.config.js][tailwind.config.js]
- Global class helper: [`cn`]([src/lib/utils.js])

## Contributing

- Follow existing patterns (Radix UI primitives + tiny custom primitives under `src/components/ui`).
- Keep components small and link to existing UI primitives (see [src/components/ui/button.jsx][src/components/ui/button.jsx]).

---

Files referenced above:
- [package.json][package.json]
- [vite.config.js][vite.config.js]
- [.env][.env]
- [tailwind.config.js][tailwind.config.js]
- [src/main.jsx][src/main.jsx]
- [src/App.jsx][src/App.jsx]
- [src/index.css][src/index.css]
- [src/lib/utils.js][src/lib/utils.js]
- [src/utils/idMapping.js][src/utils/idMapping.js]
- [src/utils/fileScanner.js][src/utils/fileScanner.js]
- [src/components/files/FileList.jsx][src/components/files/FileList.jsx]
- [src/components/UploadArtifact.jsx][src/components/UploadArtifact.jsx]
- [src/components/common/ShareModal.jsx][src/components/common/ShareModal.jsx]
- [src/components/common/FilePreviewModal.jsx][src/components/common/FilePreviewModal.jsx]
- [src/components/common/Modal.jsx][src/components/common/Modal.jsx]
- [src/components/common/InputModal.jsx][src/components/common/InputModal.jsx]
- [src/components/common/Toast.jsx][src/components/common/Toast.jsx]
- [src/components/ui/button.jsx][src/components/ui/button.jsx]
- [src/components/theme-provider.jsx][src/components/theme-provider.jsx]
