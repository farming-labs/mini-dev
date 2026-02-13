# Use Cases for mini-dev

Scenarios where **@farming-labs/mini-dev** fits well.

---

## 1. Quick prototyping without a bundler

- Spin up a TypeScript/TSX project in seconds with `pnpm add @farming-labs/mini-dev` and run `mini-dev`.
- No Vite, Create React App, or bundler config required.
- Ideal for demos, spikes, and proof-of-concept apps.

---

## 2. Small libraries or component showcases

- Use mini-dev as the dev server for a small UI library or component catalog.
- TSX and CSS with HMR for instant feedback.
- The `example/` folder doubles as the live playground.

---

## 3. Micro-frontends or internal tools

- Use `base: '/app/'` when the app is served under a subpath.
- Proxy to an existing backend with `proxy: { '/api': 'http://localhost:8080' }`.
- Suited for internal dashboards or micro-frontend demos.

---

## 4. CI / preview of static builds

- Run `mini-dev preview -r ./dist` to serve a production build locally.
- Use in CI to run integration/E2E tests against the built app.
- Simpler than starting a full Vite dev server for preview.

---

## 5. Learning and teaching

- Minimal setup lets students focus on TypeScript/React concepts.
- No Webpack/Vite configuration; one config file if needed.
- Clear separation between dev server, HMR, and env handling.

---

## 6. Embedded or resource-constrained setups

- Lightweight: few dependencies, small install footprint.
- Useful when heavier toolchains (Vite, Next.js) are overkill.

---

## 7. Env-driven frontend configuration

- `.env` with a prefix (e.g. `PUBLIC_`) and `getEnv()` for type-safe access.
- Works with your backend or API gateway.
- Keeps secrets out of the client via prefix filtering.

---

## 8. Monorepo or multi-app development

- Use `label` and `verbose` to distinguish logs across apps.
- Run multiple apps on different ports and roots.
- HMR without full-page reloads.

---

## Who it fits

- **Developers** who want a lightweight dev server without bundler setup
- **Library authors** who need a simple way to run examples
- **Teams** building internal tools or dashboards with TypeScript
- **Educators** teaching frontend development with minimal tooling
- **CI/CD pipelines** that need a preview server for E2E or visual tests

---

## When to use something else

- **Large production apps** → Vite, Next.js, or Remix for SSR, code-splitting, optimizations
- **Full-stack frameworks** → Next.js, Remix, SvelteKit
- **Highly opinionated DX** → Create React App, Vite templates

---

**TL;DR:** mini-dev suits small-to-medium TypeScript/TSX projects that want fast startup, HMR, and minimal configuration without a full bundler framework.
