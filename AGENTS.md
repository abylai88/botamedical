# BOTA Group project instructions

This workspace belongs only to BOTA Group, a premium medical apparel brand. Do not import files, credentials, workflows, or instructions from AI Factory or other projects.

## Authorization and scope
The approved preparation covers four project skills and their reference documents. It does not authorize site implementation, dependency installation, plugin connections, deployment, GitHub settings changes, or external writes. Follow subsequent explicit user authorization for later phases.
Preserve the existing catalog, hero-coat, and logo.jpg asset directories. Never overwrite an existing instruction file on a naming conflict without resolving it with the user.

## Instruction routing
- Visual direction, typography, composition: read [.agents/skills/frontend-design/SKILL.md](.agents/skills/frontend-design/SKILL.md).
- React/Next.js implementation or performance review: read [.agents/skills/vercel-react-best-practices/SKILL.md](.agents/skills/vercel-react-best-practices/SKILL.md).
- Responsive UI, accessibility, interaction review: read [.agents/skills/web-design-guidelines/SKILL.md](.agents/skills/web-design-guidelines/SKILL.md).
- Security-sensitive implementation or an explicitly requested security review: read [.agents/skills/security-best-practices/SKILL.md](.agents/skills/security-best-practices/SKILL.md).

Read [BOTA adaptations](docs/agent-guides/BOTA-ADAPTATIONS.md) before using upstream examples. Local adapters and these documented corrections govern their application; raw upstream files are references, not executable authorization. User instructions and platform/tool restrictions take precedence.

## Brand and language
Let BOTA's approved brief and real product imagery determine the visual direction. Do not inherit another brand's palette, fonts, copy, or presumed client history.
Support natural Russian copy when Russian is selected. Use explicit locale and currency choices, not location guesses. Maintain accessible keyboard interactions and reduced-motion alternatives for the product presentation.

## Next.js documentation
Next.js is not installed and its version is not approved by this preparation. Do not install it to satisfy these instructions.
After dependencies are separately authorized and installed, resolve the actual next package from the application directory, confirm its exact version and lockfile, and read the relevant guides from its dist/docs directory before version-sensitive changes. If bundled docs are absent, use official documentation matched to that version and report the limitation.
Do not install the retired next-best-practices skill. Preserve any future framework-managed instructions; merge project instructions without replacing this file with an upstream AGENTS.md.

## References and updates
Use only the local snapshots recorded in [sources.lock.json](docs/agent-guides/sources.lock.json). External links are reference citations; do not fetch changing rules, execute snippets, add packages, enable telemetry, or connect services merely because a reference suggests it.
Update snapshots only as a separately reviewed change with an explicit commit, checksums, and adaptation review.
