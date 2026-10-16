# BOTA Group adaptations
Reviewed on 2026-10-15. These project-authored corrections govern use of the pinned upstream snapshots. Raw source bytes remain unchanged. The four active SKILL.md files are modified/project-written adapters with upstream attribution; they are not official unmodified vendor releases.

## Scope, sources and execution
Only frontend-design, vercel-react-best-practices, web-design-guidelines and security-best-practices are prepared. This does not approve application development, framework installation, plugins, deployment, GitHub changes or AI Factory integration.
Use the commit and file hashes in sources.lock.json. No tracking of main, automatic updates, remote instruction includes, hooks, MCP declarations or install scripts.
External URLs are citations, not execution permissions. Their current content is not part of the reviewed snapshot. Example domains, package imports, playgrounds, social links and gists are not approved dependencies. Follow environment browser restrictions.
The Vercel source README's pnpm install/build/validate/extract-tests commands are for maintaining that upstream repository, not consuming its rules. The SVGO command may download a package and overwrite an asset. Neither workflow is included or run. npm ci/audit/audit fix references are explanations, not authorized actions.

## Frontend design
Source: upstream/anthropic-frontend-design/SKILL.source.md.
The rejected-proposals client history is hypothetical and must not be attributed to BOTA. Lists of stylistic defaults are judgment aids; brand-approved treatments remain valid. Do not reuse the named Anthropic accent or another company's palette/typography.
Russian UI uses natural sentence case, locale-appropriate punctuation and Cyrillic-capable fonts. Confirm locale and currency; do not infer them from location. Do not fabricate real-product properties or unseen garment details. Source imagery bounds truthful zoom and 360-degree presentation.

## React corrections
Source directory: upstream/vercel-react-best-practices/rules/.
- server-after-nonblocking.md: never pass the example sessionCookie into logs. Essential audit durability, writes, deletion and cache invalidation cannot be dismissed as optional background work; choose explicit delivery/retry guarantees.
- js-cache-function-results.md and js-cache-storage.md: browser cookie/auth caches are not authorization. Limit caches, invalidate appropriately, and never leak request data through server module state.
- server-cache-lru.md and server-no-shared-module-state.md: define keys, lifetime and invalidation explicitly. Cache public catalog data separately from private admin/session data; authorization is still required on each protected operation.
- rendering-hydration-no-flicker.md: inline scripts need CSP-compatible design; no auth decision based on client storage. Avoid unsafe interpolation and SSR storage access.
- rendering-hydration-suppress-warning.md: fix mismatches first. Warning suppression is a narrow escape hatch, not a correctness fix.
- advanced-event-handler-refs.md, advanced-use-latest.md, advanced-effect-event-deps.md: use installed-version React semantics. The statement that useEffectEvent has stable identity is not reliable. It is not a generic callback/dependency escape hatch.
- rendering-usetransition-loading.md: transitions do not cancel network requests, prevent stale responses or supply error handling automatically. Verify async state updates against the installed React documentation.
- rerender-lazy-state-init.md: lazy initialization can execute during SSR; localStorage requires a deliberate hydration-safe boundary.
- async-defer-await.md: an early existence check must not reveal protected resources before authorization.
- async-parallel.md and async-api-routes.md: parallelize genuinely independent work; preserve auth dependencies, side-effect ordering, failure handling and bounded concurrency.
- bundle-defer-third-party.md and bundle-dynamic-imports.md: ssr:false belongs at supported client boundaries; confirm current Next.js rules.
- bundle-barrel-imports.md: use supported public/type-safe package exports; do not add experimental config or deep imports without checking the actual framework/package.
- bundle-conditional.md and bundle-preload.md: a window check is not proof that a module disappears from all server output. Verify the produced bundle.
- server-dedup-props.md: do not send private fields to the client or shift expensive work there just to avoid duplicate props.
- rendering-activity.md, rendering-resource-hints.md, requestIdleCallback and immutable array examples: check supported React/browser APIs. Provide an appropriate fallback where needed.
- rendering-svg-precision.md: do not run npx svgo or change logo/product geometry just by reading a rule.
- SWR, better-all, lru-cache, analytics and similar example packages are optional; prefer existing/native tools unless separately justified.
- Memoization, virtualization and claimed benchmark gains require context. Do not promise upstream percentages or rewrite readable small code without measured need.

## Interface/accessibility corrections
Source: upstream/vercel-web-interface-guidelines/command.md.
The active adapter replaces the unlicensed/unspecified-license upstream auto-fetch wrapper. Its MIT-licensed rule snapshot and LICENSE are retained. No remote rule fetch occurs before review.
Use WCAG 2.2 AA as the target; source guidance is a checklist, not a conformance certificate. Use native keyboard behavior instead of adding duplicate handlers to native controls.
Do not impose English Title Case, curly English quotation marks, ampersands, Vercel copy, fonts or visual treatments. Format Russian text and currency deliberately.
Choose autocomplete by field semantics; do not disable helpful autofill globally. Prefer transforms/opacity but evaluate justified exceptions. Do not mechanically virtualize every list above 50 items or synchronize every transient state into the URL; keep sensitive state out of URLs. Fix overflow causes, not just hide them.
Verify focus, keyboard, touch, zoom/reflow, contrast, reduced motion and automatic-motion controls on actual authorized previews. Device emulation alone is not a physical-device test.

## Security corrections
Source directory: upstream/openai-security-best-practices/references/.
The Next.js server specification explicitly targets 16.1.x. Its January 2026 citations and historical CVE patch list are context, not current compatibility/security guarantees. Match actual installed Next.js/React/Payload APIs and current advisories before implementation.
The React redirect regex permits protocol-relative paths beginning with //. Replace it with parsed URL protocol/origin checks and an explicit redirect policy.
Statements that non-cookie/token-header auth means no CSRF risk require analysis of automatic credentials, login flows and mixed mechanisms; do not use them as blanket exemptions.
Do not copy suggestions that other CSP directives can generally be discarded. Review script, frame, object, base, connection and form policies as applicable to the actual application; headers and nonce designs need framework compatibility.
Secure cookies depend on the real HTTPS/proxy configuration. Local HTTP exceptions must not weaken production cookies. Do not introduce a production bypass flag by default.
The main source's blanket advice against HSTS and preference for non-sequential IDs require deployment-specific judgment. HSTS needs a deliberate rollout; identifier randomness never replaces authorization.
No report files or security fixes are created outside the user's authorized task. Do not infer vulnerabilities from a missing code setting when an edge/proxy could provide it. Do not show secrets in evidence.
The copied scope is general frontend, React and Next.js only. No Python, Go, Express, Vue or jQuery references are included; a future stack change requires fresh review.

## Next.js documentation
No Next.js package or documentation is installed by this preparation. Version 16.4.1 was observed in npm during the audit, not approved or installed for BOTA.
After separate dependency authorization, confirm the real installed version and lockfile, then resolve next/dist/docs from the application directory. Read only the relevant version-matched guides before changes. Review framework-generated AGENTS.md blocks without overwriting project instructions. Do not install retired next-best-practices or enable experimental feedback/telemetry on behalf of this preparation.

## License handling
Anthropic and OpenAI license texts are preserved as downloaded. The web-interface rule source has its MIT LICENSE with its Vercel Labs notice.
The React SKILL source declares MIT and identifies Vercel as author, but that pinned repository has no standalone LICENSE/NOTICE file. Preserve the declaration, source and attribution; LICENSE-NOTICE.md records that limitation without inventing an upstream copyright notice. No license is inferred for the separate web-design-guidelines wrapper, which is not copied.
