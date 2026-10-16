# BOTA Group agent guides

Prepared under the user's approval for four project-local skills only. This folder is a reviewed reference collection, not application code or a dependency installation.

## Entry points
The project root AGENTS.md routes tasks to four adapters under .agents/skills:
frontend-design, vercel-react-best-practices, web-design-guidelines, security-best-practices.
The adapters refer to this folder using relative links. Read BOTA-ADAPTATIONS.md before using upstream examples.

## Provenance
sources.lock.json records immutable source commits, each copied path, Git blob SHA-1, SHA-256, byte length, license notes and generated instruction hashes. The copied bytes were checked against the tree of the pinned commit; four entry documents additionally match SHA-256 values retained from the prior audit.
upstream contains 80 source files: 2 Anthropic files, 71 React files (source index and 70 rules), 2 web-interface files, and 5 OpenAI files (source index, license and 3 selected references).
SKILL.source.md is an archival entrypoint. Do not treat its commands, changing URLs or references to excluded AGENTS.md as active project instructions.

## Updating
Do not follow a moving branch automatically. An update requires a selected commit, full review of changed instructions/rules and licenses, updated corrections, downloaded-byte/hash verification and local-link validation. Preserve existing instruction files on conflict.
Snapshots contain illustrative unsafe code for comparison. Its presence in the archive is not permission to execute it.

## Validation and limits
Check exactly four active SKILL.md manifests, relative links in project-authored instructions, pinned source URLs, byte counts, all hashes, and preservation of existing product assets.
The original upstream documents can contain links to material outside this intentionally narrowed snapshot; active adapters explain their supported scope.
The bundled Python quick_validate.py was inspected but could not run because PyYAML is unavailable in both available Python runtimes. No package was installed; equivalent manifest/placeholder checks and additional integrity/link checks use existing tools.
This turn cannot attest automatic discovery: .agents/skills is the project-local convention, and a subsequent context refresh/new session must show these four names in the client-provided skills catalog. Until then AGENTS.md provides explicit routing, and files can be read directly.
No Next.js version is installed/selected, no application behavior is tested, and no plugins/GitHub settings are changed. Raw third-party reference links are not all checked for live availability.

## Licensing
Preserve the Apache 2.0 license texts, the web-interface MIT license, upstream author attribution and modification notices. The React source declares MIT but contains no standalone license file; its LICENSE-NOTICE.md documents this.
