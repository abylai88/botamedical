---
name: vercel-react-best-practices
description: Apply reviewed Vercel React performance guidance to authorized BOTA Group React or Next.js changes and performance reviews.
license: MIT
metadata:
  adapted-for: BOTA Group
  upstream-author: Vercel Engineering
---

# React performance for BOTA Group

This BOTA adapter routes to pinned Vercel references. First read [BOTA corrections](../../../docs/agent-guides/BOTA-ADAPTATIONS.md). Use the [upstream index](../../../docs/agent-guides/upstream/vercel-react-best-practices/SKILL.source.md) only to select relevant files in its adjacent rules directory. The upstream compiled AGENTS.md is deliberately not included; its reference in the source index is inactive.

Prioritize independent data loading, a small initial client bundle, stable component identity, and minimal data crossing server/client boundaries. Read only relevant detailed rules, not all 70 on every task. Performance labels and benchmark multipliers are source claims, not measured results for BOTA.

Use the actual installed React/Next.js documentation to resolve version-sensitive APIs, compiler behavior, imports, and caching. Do not adopt a code example blindly. Apply memoization and micro-optimizations for demonstrated cost, not as mandatory syntax.

Mandatory corrections:
- Authenticate and authorize protected mutations on the server. Client auth flags and cookie caches never grant access.
- Never log a session cookie or token from the server-after-nonblocking example.
- Keep request/user data out of shared mutable module state. Shared public catalog caches require an invalidation design after edits; private admin responses must not enter public caches.
- Inline hydration scripts require an audited CSP-compatible design and cannot determine authorization. Do not suppress hydration warnings to conceal defects.
- Follow version-matched useEffectEvent semantics; it is not a stable general-purpose callback or a way to hide reactive dependencies.
- Async transitions do not automatically cancel network requests or resolve out-of-order results.
- SSR rendering must not read browser storage without an appropriate client boundary and safe hydration design.

SWR, better-all, lru-cache, SVGO, analytics, and other packages shown in examples are optional. Do not install them or execute upstream commands as part of reading this skill. Prefer existing dependencies and native APIs where appropriate.

For license provenance see [the retained declaration](../../../docs/agent-guides/upstream/vercel-react-best-practices/LICENSE-NOTICE.md).
