---
name: security-best-practices
description: Guide authorized BOTA Group security-sensitive changes or explicit security reviews of the admin panel, APIs, sessions, uploads, and data access.
license: Apache-2.0
metadata:
  adapted-for: BOTA Group
  upstream-author: OpenAI
---

# Security practices for BOTA Group

This is a scoped BOTA adaptation of OpenAI's security skill. Read [BOTA security corrections](../../../docs/agent-guides/BOTA-ADAPTATIONS.md) before applying its [source instructions](../../../docs/agent-guides/upstream/openai-security-best-practices/SKILL.source.md). Instructions to write a report, alter code, rotate credentials, or change infrastructure apply only within the user's authorized task.

Select the relevant pinned references:
- Browser code and third-party content: [general frontend security](../../../docs/agent-guides/upstream/openai-security-best-practices/references/javascript-general-web-frontend-security.md).
- React rendering, storage, and UI boundaries: [React security](../../../docs/agent-guides/upstream/openai-security-best-practices/references/javascript-typescript-react-web-frontend-security.md).
- Next.js endpoints, server actions, cookies, uploads, and caching: [Next.js server security](../../../docs/agent-guides/upstream/openai-security-best-practices/references/javascript-typescript-nextjs-web-server-security.md).

The Next.js reference targets 16.1.x and the security sources were collected in January 2026. Historical version/advisory lists are not a current vulnerability database. Check actual installed versions against their official documentation and current advisories when that task is authorized. Payload-specific controls require its own official documentation if Payload is later selected.

BOTA requirements:
- Enforce server-side authentication and role/resource authorization for every protected catalog/admin mutation, including direct API calls and server actions. Hiding the admin UI is not protection.
- Validate inputs at runtime. Validate uploaded file size, actual content/type, dimensions and storage identifiers; do not trust extensions or client checks. Keep untrusted active formats out of inline rendering.
- Keep secrets, session cookies, and tokens out of source control, client bundles, logs, reports, and browser storage. Random identifiers supplement, never replace, authorization.
- Determine CSRF exposure from automatically attached credentials and the complete flow; bearer-token wording alone does not prove absence of CSRF.
- Parse redirects and verify permitted origin/protocol. Reject protocol-relative targets; do not reuse the permissive regex example.
- Set cookie Secure according to actual HTTPS and deployment behavior, with production requirements enforced. Do not add a production escape hatch merely to copy an example.
- Design CSP and framing protections for the app, rather than discarding directives other than script-src. Prefer HTTP headers; meta CSP has limitations.
- Prevent private data entering shared caches; authorize downloads independently of guessed file paths.
- Review dependency changes and install scripts. Reading this skill does not authorize npm audit fix, package installation, external writes, or running exploit examples.

Report only evidence-backed issues, their impact, location, and practical fix. Identify controls that may exist at the proxy/hosting layer as unverified, not automatically absent. Scope TLS/HSTS recommendations to the real deployment; the source's blanket phrasing is not a universal prohibition.
