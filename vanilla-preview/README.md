# Vanilla foundation preview

This directory is an isolated, non-production foundation for the HTML/CSS/JavaScript migration.

- It is deliberately separate from `client/`, the current Vite/React entry point, and the production service worker.
- The page uses semantic Arabic RTL HTML, a shared responsive header/navigation/footer, light/dark theme persistence, share fallback, accessible mobile navigation, and reduced-motion support.
- The theme preference reuses the existing `theme` localStorage key.
- It does not fetch weather data, request location permission, register a service worker, or claim that install support is active.
- Links point to the current public route paths for layout continuity, but this preview itself is not published by the existing build.
- Do not move this page into the production root or change the Pages entry point until the route/data modules have been ported and verified.

Preview locally with any static HTTP server rooted at the repository root, then open `/vanilla-preview/`.
