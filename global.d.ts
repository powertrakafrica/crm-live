// Ambient declarations for side-effect CSS imports.
//
// Next's own types (node_modules/next/types/global.d.ts) declare
// `*.module.css` / `*.module.sass` / `*.module.scss` but deliberately NOT plain
// `*.css`: by default TypeScript does not check side-effect imports, so
// `import "./globals.css"` needs no declaration. Under stricter checking
// (`noUncheckedSideEffectImports`) or some editor TS configurations, that same
// import errors with TS2307 — which is what previously led someone to delete
// the import and break all global styling.
//
// `import "./globals.css"` in app/layout.tsx is load-bearing: app/globals.css
// contains `@import "tailwindcss";` (the Tailwind v4 entry) and the @theme
// tokens. Do NOT remove it. This declaration lets the side-effect import
// resolve under strict configs. Plain `*.css` (side-effect only) and
// `*.module.css` (named/default bindings, declared by Next) are distinct
// wildcard patterns, so there is no duplicate-identifier conflict.
declare module "*.css";