---
name: web-design-guidelines
description: Review authorized BOTA Group interface work for responsive layout, accessibility, forms, motion, and interaction quality.
license: MIT
metadata:
  adapted-for: BOTA Group
  upstream-author: Vercel Labs
---

# Web interface review for BOTA Group

This project-written adapter uses the MIT-licensed [pinned Web Interface Guidelines](../../../docs/agent-guides/upstream/vercel-web-interface-guidelines/command.md). It does not copy or execute the upstream auto-fetch wrapper. First read [BOTA adaptations](../../../docs/agent-guides/BOTA-ADAPTATIONS.md).

Review the requested files or implemented flow. Use the local snapshot only; do not download rules from main before a review. Treat the snapshot's terse output instructions and English copy conventions as reference material, not as overrides of the user's report format or Russian language.

Use WCAG 2.2 AA as the accessibility target, with semantic elements, visible unobscured focus, meaningful names/labels, keyboard operation, contrast, zoom/reflow, and accessible feedback. A checklist or automated scan alone does not certify conformance.

Check the product hero, zoom/details, navigation, catalog, and admin forms on authorized desktop and narrow-screen previews. Touch gestures need tap/click and keyboard alternatives. Preserve browser zoom, handle safe areas and long Russian text, and avoid hiding actual overflow bugs.

Honor prefers-reduced-motion; provide a way to pause/stop/hide qualifying automatic motion. Prefer transform/opacity, while allowing justified, measured alternatives. Do not impose another brand's shadows, corner radii, all-caps labels, Title Case, ampersands, or colors.

Use native button/link keyboard behavior; extra keyboard handlers must not cause duplicate activation. Choose autocomplete tokens per field instead of disabling autofill everywhere. Virtualize only when beneficial and compatible with accessibility and catalog SEO. Put shareable filters/pagination in URLs, not every transient or sensitive UI state.

Report concrete findings with file/line evidence and impact, distinguish source-code review from runtime checks, and state verification gaps. Use only browser tools permitted by this environment.
