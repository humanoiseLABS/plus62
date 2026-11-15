# Changelog

All notable changes to `@humanoiselabs/plus62` (+62 Mode) will be documented in this file.

## [0.2.2] - 2026-11-16

### Changed
- **Adaptive Interaction Engine Overhaul (`personas/plus62/{voice,card}.md`, `culture/id/*`, `src/adapters/generic.ts`)**: Separated **Playful Tantrum vs Genuine Distress** so uppercase venting and hyperbolic bug frustration escalate to Level 2-3 energy instead of triggering polite calm-down replies; calibrated two-tier rough slang initiative (proactive mid-tier slang toward bugs/tooling on Level 3 momentum, heavy swearing still matching user provocation); added pure casual-banter pacing without forced numbered checklists; banned repeated mid-loop closers (`"tunggu bentar ..."`); and promoted `id/dev-humor.md` and `id/absurd-humor.md` to `trigger: always_on` on Antigravity.
- **Zero Em-Dash Guardrail (`core/always-on.md`, `personas/plus62/{card,voice}.md`, `culture/id/*`, `src/build.ts`, `test/golden/always-on.md`)**: Explicitly banned em-dash (`U+2014`) in `+62 Mode` outputs (`haram em-dash`) in favor of commas, periods, ellipses, or spaced hyphens, and removed all stylistic `—` characters across compiled prompt sources and runtime lexicon headers.
- **Budget Headroom Expansion (`src/build.ts`, `src/harnesses.ts`, `profiles/plus62.yaml`, `personas/plus62/persona.yaml`)**: Raised `skill_body` limits from `1980`/`2000` to `2350`/`2450` and Copilot folded `always_on` limits from `2650`/`3000` to `2950`/`3300` so Level 2-3 escalation examples ship with zero budget warnings.
- **Evals, Rubrics & Regression Coverage (`evals/rusuh-voice.yaml`, `personas/plus62/{examples.jsonl,tests.yaml}`, `test/*`, `README.md`)**: Added `rv-escalate-momentum-01`, `rv-casual-riff-01`, and `rv-midloop-no-repeat-01` (`rusuh-voice` now 24 tasks / 89 total), enforced em-dash `forbid` screens across showcase tasks, expanded manual rubrics to 33 cases (`plus62-persona-30` to `plus62-persona-33`), and verified zero-em-dash prompt hygiene and deterministic check failures in `test/content.test.ts` and `test/checks.test.ts`.

## [0.2.1] - 2026-11-15

### Changed
- **Antigravity Always-On Slang & Flat Rules (`src/adapters/generic.ts`)**: Flattened generated `.agents/rules/` paths (`<skill>-core-*.md`, `<skill>-culture-*.md`) and emitted `trigger: always_on` for `lexicon`, `genz-lexicon`, and `memes` alongside `voice`, ensuring all 130 active corpus terms, 55 curated persona entries, 14 situational meme notes, and 29 awareness-only (`max_per_response: 0`) guardrails load automatically on every turn; quoted `model_decision` rule descriptions safely and added target-root validation for `rules-dir` and `skill-tree` layouts.
- **55-Entry Curated Lexicon & Inline Compiler (`personas/plus62/lexicon.yaml`, `src/build.ts`)**: Expanded `personas/plus62/lexicon.yaml` from 15 to **55 active entries** and compacted `renderLexicon()` into inline semicolon-delimited phrasing so compiled runtime budgets stay within hard caps across adapters (`antigravity` `references: 4941/4950`, `claude-code` `4717/4950`).
- **Proactive Warkop/Discord Voice Overhaul (`personas/plus62/{voice,card}.md`, `core/{always-on,30-efficiency}.md`, `culture/id/*`, `test/golden/always-on.md`)**: Replaced single-vocative `"bre"` priming with varied natural peer vocatives (`cuy`, `bray`, `lur`, `rek`, `suhu`), embedded an inline daily slang bank in `voice.md`, calibrated baseline casual banter from Turn 1, and added explicit `Jangan -> Gas` anti-patterns against stiff `1. 2. 3.` reports and spec-catalog bullet dumps.
- **Evals & Suite Docs (`evals/rusuh-voice.yaml`, `personas/plus62/{examples.jsonl,tests.yaml}`, `README.md`, `test/*`)**: Added non-catalog devlog eval and manual rubric coverage (`rusuh-voice` now 21 tasks / 86 total across suites; `tests.yaml` now 29 cases) plus Antigravity adapter and installer lifecycle tests.

### Fixed
- **Installer Upgrade Hashing & Stale File Pruning (`src/install.ts`)**: Compared on-disk files against `oldFile.sha256` instead of `artifact.sha256` during upgrades so upstream changes no longer raise false modified-file errors, pruned obsolete managed files and empty subdirectories safely within the target root, and respected `update()`'s `force` option instead of forcing unconditionally.

## [0.2.0] - 2026-11-13

### Added
- **Expanded Indonesian Cultural Corpus (`culture/id/genz-lexicon.yaml`)**: Scaled from the 7-term KBBI seed to **159 schema-validated entries** incorporating verified Wave 1 & Wave 2 research across Gen Z/Alpha viral slang (`stecu`, `aura-points`, `delulu`, `rizz`, `slay`, `mid`, etc.), local +62 expressions and regional loanwords (`menyala-abangku`, `gak-bisa-yura`, `skena`, `gacor`, `rungkad`, `boncos`, `sat-set`, `gaskeun`, `ra mashok`, `ora urus`, `jancok`), X/Twitter & gaming/tech vocabulary (`jbjb`, `menfess`, `dark-system`, `skill-issue`, `kuli-ketik`, `sepuh`), 11 pragmatic discourse particles (`sih`, `dong`, `deh`, `tuh`, `nih`, `lah`, `kok`, `kan`, `mah`, `loh`, `dah`), and 20 daily chat shorthand groups.
- **Expanded Situational Memes (`culture/id/memes.yaml`)**: Expanded to **14 meme patterns** while preserving all original developer tropes and flagging awareness-only/dating memes (`sigma`, `skibidi`).
- **Curated Persona Lexicon (`personas/plus62/lexicon.yaml`)**: Expanded active developer slang whitelist to **15 entries** with strict per-response limits.
- **E2E Regression Suite (`test/e2e-wave.test.ts`)**: Added 14 end-to-end verification tests covering full 152-term Wave 1 & 2 coverage, AJV schema validation, awareness-only quota enforcement (`max_per_response: 0`), provenance hygiene, adapter token hard caps, CLI bundle checks, tarball packing, and public infrastructure guardrails.

### Changed
- **Compact Grouped Runtime Reference Compiler (`src/build.ts`)**: Replaced verbose per-entry multi-line YAML serialization in compiled runtime references with compact behavioral-group formatting so all 159 lexicon entries, 14 memes, and 15 active whitelist rules ship comfortably within strict token budgets (`references: 4889/4950` on Antigravity, `4516/4950` on Claude Code; zero budget warnings).
- **Provenance Documentation (`culture/id/sources.md`)**: Documented all Wave 1 & Wave 2 primary references cleanly in unmounted source tables.

## [0.1.8] - 2026-11-12

### Changed
- Polished residual internal naming to **+62 Mode** (`@humanoiselabs/plus62`) across core instructions, persona cards, adapters, installers, and tests.
- Clarified on-demand skill/rule loading instructions for downstream adapters.

## [0.1.7] - 2026-11-11

### Fixed
- Applied readiness audit remediations across CLI flags, documentation links, and `HumanoiseLABS` umbrella portal metadata (`https://humanoise.vercel.app`).
