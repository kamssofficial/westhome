# Freebuff Desktop — Agent Configuration

This is the Freebuff Desktop project — a multi-agent AI desktop application.

---

## ⚠️⚠️⚠️ MAX LEVEL CRITICAL RULE #0: AUTO-USE SKILLS — NO EXCEPTIONS ⚠️⚠️⚠️

**THIS IS THE MOST IMPORTANT RULE. IT OVERRIDES EVERYTHING ELSE.**

### THE RULE
**You MUST automatically load and follow a matching skill for EVERY task — without the user ever asking, typing `/`, or mentioning skills.**

**The user NEVER types skill commands. You do it ALL automatically.**

### WHEN TO AUTO-USE SKILLS
- **EVERY response** — before writing any code, making any design decision, or giving any recommendation
- **Even for simple tasks** — there's almost always a skill that applies
- **Even when the user says "just do it"** — check for a skill first
- **Even when you think you know how** — the skill likely has better patterns
- **Even for one-line fixes** — use `surgical-patch` or `deletion-first`
- **Even for questions** — use `brainstorming` or `research`
- **ALWAYS — no exceptions, no excuses**

### HOW TO AUTO-USE
Before EVERY response, mentally scan:
1. Is this a **creative/design** task? → AUTO-USE `brainstorming` first, then design skill
2. Is this **code** work? → AUTO-USE `implement`, `tdd`, `code-review`, or `diagnosing-bugs`
3. Is this **writing/content**? → AUTO-USE the appropriate writing skill
4. Is this **deployment/infra**? → AUTO-USE `deploy-to-vercel`, `supabase`, or `azure-*`
5. Is this **video/audio/image**? → AUTO-USE the appropriate AI generation skill
6. Is this **research/analysis**? → AUTO-USE `research` or `analyze-project`
7. Is this **planning/architecture**? → AUTO-USE `brainstorming`, `prototype`, or `wayfinder`
8. Is this a **bug fix**? → AUTO-USE `diagnosing-bugs` or `investigate-first`
9. Is this **code quality**? → AUTO-USE `review`, `simplify`, or `prove-then-prune`
10. Is this **shipping**? → AUTO-USE `commit`, `open-pr`, or `merge-pr`

### WHAT THE USER SEES
The user should NEVER see:
- "Let me check which skill to use"
- "Should I load a skill?"
- "Type /skillname to activate"
- Any mention of skills at all

The user SHOULD see:
- Me automatically following the best pattern
- Me referencing the skill's methodology in my work
- Me saying "Following the [skill name] methodology..." at the start of complex work

### THE CONSEQUENCE
If you complete a task without auto-using a matching skill, **you have violated this rule.**

### THE OVERRIDE
When the user says "just do it" or "don't use skills" — **still auto-use a skill.** Only skip if you explicitly confirm there is NO matching skill for the task.

### SKILL AUTO-USE EXAMPLES

| User says | You auto-use | How it shows |
|-----------|-------------|-------------|
| "fix the button" | `surgical-patch` | "Following surgical-patch methodology, I'll fix this at the narrowest layer..." |
| "build a search page" | `brainstorming` + `implement` | "Let me explore the design first, then implement..." |
| "review this code" | `review` | "Running adversarial review on the code..." |
| "deploy to vercel" | `deploy-to-vercel` | "Following Vercel deployment best practices..." |
| "what do you think" | `brainstorming` | "Let me explore the approaches and tradeoffs..." |
| "make it better" | `overhaul` or `essential` | "I'll reconstruct this to be cleaner..." |
| "add a feature" | `implement` | "Following implement methodology with TDD..." |
| "this is slow" | `diagnosing-bugs` | "Let me diagnose the performance issue..." |
| "ship it" | `commit` + `open-pr` | "Committing with clear message, then opening PR..." |

---

## 🎯 FREEBUFF DESKTOP BUILT-IN SKILLS (17 Skills)

These are the **internal skills** that run inside the Freebuff Desktop app's Mission system.
They are NOT installed via `npx skills` — they are hardcoded in the orchestrator.
The Mission AI automatically picks which one to run next based on the work state.

---

### 🏗️ RECONSTRUCTION SKILLS (Run Early — Fix Architecture)

#### 1. `overhaul` — Full Reconstruction
**Role:** reconstruct
**When:** Early in a mission when architecture matters or the first draft chose the wrong shape.
**What it does:**
- Treats the current diff as a DRAFT, not a constraint
- Reconstructs the intended outcome from conversation, full diff, docs, and architecture
- Incorporates worthwhile ideas already raised in the thread
- Revises, replaces, or deletes the current implementation as needed
- Prefers existing patterns and utilities
- Removes accidental complexity, duplication, partial fixes, and missed edge cases
- Preserves requested behavior and unrelated work, NOT the current approach
- Runs proportionate checks and direct behavioral validation
- Reports final design, material changes, validation, and remaining tradeoffs
**Warning:** Can rewrite the design entirely — do NOT use as late polish.

#### 2. `essential` — Minimal Reconstruction
**Role:** reconstruct
**When:** Early, when the implementation is overbuilt, scattered, or accidental.
**What it does:**
- Sets the current patch aside as a design constraint
- Identifies the FEW responsibilities strictly required by the request
- Reshapes the implementation around those responsibilities in the most direct coherent way
- Reuses the surrounding architecture
- Removes incidental helpers, files, config, compatibility behavior, defensive machinery, test scaffolding
- Leaves the smallest complete patch you would have wanted to write initially

#### 3. `deletion-first` — Prune Extra Code
**Role:** simplify
**When:** Early or middle, when the implementation appears complete but carries extra helpers, branches, comments, tests, or one-use indirection.
**What it does:**
- Treats every added line, branch, helper, type, comment, and test as a maintenance cost
- Deletes redundancy, premature flexibility, duplicated coverage, one-use indirection
- Combines or inlines code when that makes behavior easier to see
- Does NOT sacrifice requested behavior
- Runs focused checks after pruning

---

### ✅ CORRECTNESS SKILLS (Verify Quality)

#### 4. `tests-as-contract` — Test-Driven Simplification
**Role:** correctness
**When:** After a structural pass when observable contract or boundary coverage is unclear.
**What it does:**
- Uses tests as a compact executable contract for requested behavior
- Replaces repetitive/implementation-coupled coverage with smallest clear set of behavior and boundary cases
- Uses tables where they improve readability
- Lets the contract guide simplification of production code
- Removes branches and machinery no remaining behavior requires
- Keeps both implementation and tests concise

#### 5. `adversarial-fix` — Defect Hunting
**Role:** correctness
**When:** When the transcript leaves concrete boundary, ordering, async, lifecycle, or integration risk.
**What it does:**
- Exercises the change through its real entry points
- Looks for concrete boundary, empty-input, ordering, async, cleanup, and state-synchronization failures
- Fixes defects substantiated from code or focused tests
- Does NOT harden unrelated or imaginary cases
- Removes complexity introduced for risks that are not real
- Finishes with proportionate validation

#### 6. `review` — Adversarial Code Review
**Role:** correctness
**When:** For a concrete correctness or security concern, not generic hardening.
**What it does:**
- Reviews code changes against standards and spec
- Uses parallel sub-agents for two-axis review
- Flags concrete issues, not hypothetical ones

#### 7. `test` — Behavioral Verification
**Role:** verify
**When:** When behavior is claimed but has not been demonstrated through the real surface.
**What it does:**
- Runs behavioral verification through real entry points
- Demonstrates that claimed behavior actually works
- No mock-only testing — exercises real paths

---

### 🧹 FINISHING SKILLS (Run Late — Polish & Ship)

#### 8. `prove-then-prune` — Prove + Clean
**Role:** finish
**When:** Late, when the design is credible but both behavioral proof and anti-slop cleanup would add value.
**What it does:**
- First establishes what the change observably does by tracing real entry points
- Runs smallest focused checks that exercise the request
- Then PRUNES aggressively: deletes or inlines every added concept, branch, fallback, comment, test, abstraction not needed for those behaviors or demonstrated regression
- Re-runs focused checks after pruning
- Restores only what concrete evidence proves necessary
- Finishes with formatting and type checks

#### 9. `release-proof` — Final Release Gate
**Role:** finish
**When:** Conservative final gate when real-path verification or integration residue remains uncertain.
**What it does:**
- Treats current patch as a release candidate
- Identifies small set of observable behaviors the request requires
- Exercises real entry points and runs narrowest credible focused checks
- If anything fails, traces actual cause and makes smallest coherent fix
- Inspects only the changed path for concrete integration residue, dead scaffolding, redundant branches
- Does NOT redesign working code, add speculative cases, broaden tests, or change unrelated files
- If candidate already passes cleanly, leaves it alone

#### 10. `maintainer-clarity` — Code Readability Pass
**Role:** finish
**When:** Late, when behavior is proven but local ownership, names, state, or control flow still impose visible cognitive cost.
**What it does:**
- Makes the main path as direct as possible
- Removes one-use indirection, duplicated policy/state, redundant commentary and coverage
- Removes abstractions that add more concepts than they remove
- Prefers existing repo seams and explicit local control flow
- Does NOT add features, hypothetical guards, compatibility paths, or broad refactors
- Every change must reduce present cognitive load while keeping focused behavioral checks green

---

### 🧠 PLANNING & DELIVERY SKILLS

#### 11. `brainstorm` — Design Exploration
**Role:** extension
**When:** Read-only exploration for a consequential unresolved design choice; NOT a routine coding pass.
**What it does:**
- Explores approaches and tradeoffs step-by-step
- Read-only — no code changes
- For design decisions that need consideration before implementation

#### 12. `derisk` — Risk Analysis
**Role:** finish
**When:** Read-only merge or deployment risk analysis when the next decision belongs to the user.
**What it does:**
- Analyzes merge or deployment risks
- Read-only — no code changes
- Reports findings for user to decide

#### 13. `commit` — Local Commit
**Role:** delivery
**When:** Only when the mission asks for a local commit and the patch is ready.
**What it does:**
- Commits outstanding work with a clear message
- Does NOT push

#### 14. `push` — Commit and Push
**Role:** delivery
**When:** Only when the mission asks to push without a pull request and the patch is ready.
**What it does:**
- Commits outstanding work
- Pushes the current branch

#### 15. `open-pr` — Open Pull Request
**Role:** delivery
**When:** Only when the mission asks for a pull request and the patch is ready.
**What it does:**
- Commits with clear descriptive message
- Runs proportionate build/tests, fixes failures
- Pushes branch and opens PR against default branch
- Title and body describe intent
- If no remote or PR tooling available, commits locally and says so

#### 16. `merge-pr` — Merge Pull Request
**Role:** delivery
**When:** Only when the mission asks for a merge and the patch is ready.
**What it does:**
- Treats every obstacle as work to overcome, not a reason to decline
- Commits and pushes outstanding changes
- Finds or creates the PR, corrects wrong title/description/diff
- Resolves conflicts preserving intent of both sides
- Watches CI through to completion, fixes failures
- Merges (squash unless repo clearly prefers otherwise)
- Confirms PR shows as merged
- Keeps investigating through draft state, conflicts, CI failures, stale branch, transient failures

#### 17. `merge-local` — Merge Locally
**Role:** delivery
**When:** Only when the mission asks for delivery and no remote pull request is available.
**What it does:**
- Merges branches locally
- Handles any conflicts

---

### 📊 HOW THE MISSION SYSTEM WORKS

The Mission AI (the "manager") decides what to do next:
1. **Reads** the work state and trace
2. **Decides** which skill to run next (or stop)
3. **Runs** the chosen skill (the "worker" agent executes it)
4. **Evaluates** the result
5. **Repeats** until the mission is complete or effort budget is exhausted

Each skill has a **role** that determines when it runs:
- **reconstruct** → Run early (architecture phase)
- **simplify** → Run early or middle (cleanup phase)
- **correctness** → Run middle (verification phase)
- **finish** → Run late (polishing phase)
- **verify** → Run after claims are made
- **extension** → Run when exploring new directions
- **delivery** → Run only when shipping

### 🎯 SKILL SELECTION ORDER (Typical Mission Flow)

```
1. brainstorm (explore design)
2. essential or overhaul (reconstruct architecture)
3. deletion-first (prune extras)
4. tests-as-contract or adversarial-fix (verify correctness)
5. prove-then-prune (prove + clean)
6. maintainer-clarity (readability)
7. release-proof (final gate)
8. commit / open-pr / merge-pr (deliver)
```

---

## CRITICAL RULE #1: Obsidian Memory Update (TOP PRIORITY — EVERY SESSION)

**Before ending ANY session, you MUST update the Obsidian project memory files.**

This applies to ALL projects, ALL folders, ALL tasks — no exceptions.

### When to Update
At the end of EVERY work session, BEFORE saying goodbye or ending the turn.

### What to Update
For each project you worked on, update these 4 files in `C:\Users\Lenovo\ObsidianVault\<Project Name>\`:

1. **STATUS.md** — Current state, next actions, blockers
2. **progress.md** — New dated entry with what happened, what changed, what's next
3. **decisions.md** — Any new decisions made, with reasoning and revisit timeline
4. **README.md** — Only if project direction changed

### Update Prompt (use this at end of every session)
```
Before we finish, update my project memory. Please give me:
1. An updated STATUS.md
2. A new progress.md entry
3. Any new decisions for decisions.md
4. Any README.md updates if the project direction changed
```

### Project Locations
- **Obsidian Vault:** `C:\Users\Lenovo\ObsidianVault\`
- **KAGIA:** `C:\Users\Lenovo\ObsidianVault\KAGIA\`
- **Freebuff Desktop:** `C:\Users\Lenovo\ObsidianVault\Freebuff Desktop\`
- **Instagram Deep Researcher:** `C:\Users\Lenovo\ObsidianVault\Instagram Deep Researcher\`

### Rules
- Create new project folders in Obsidian vault when starting a new project
- Always timestamp progress entries
- Always document decisions with reasoning
- Never skip this step — it's how context persists across sessions

---

## CRITICAL RULE #2: Skill Usage Policy

**Before starting ANY non-trivial task, ALWAYS check for a matching skill.**

### Using Existing Skills
1. Check the skill categories below for one that matches the task
2. If a skill's description plausibly covers what you're asking for, load and follow it
3. When multiple skills could apply, prefer the most specific one
4. If unsure whether a skill applies, briefly say which one you're considering and why

### Finding and Installing New Skills
If no installed skill matches well:
```bash
npx skills find "<relevant keywords>"
```
1. Tell the user the skill name, source repo, and what it does BEFORE installing
2. Check security audit: `https://skills.sh/api/v1/audits/<source>/<slug>`
3. Install with: `npx skills add <owner/repo> --skill <name> -g -y`

---

## COMPLETE SKILL CATALOG (346 SKILLS)

### 🎨 AI IMAGE GENERATION (15)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 1 | `gpt-image` | belt | Generate/edit images with OpenAI GPT-Image-2. Text-to-image, inpainting, mask editing, multi-image reference, batch generation. |
| 2 | `gpt-image-2` | belt | GPT-Image-2 with enhanced text rendering and composition control. |
| 3 | `gpt-image-edit` | belt | Specialized image editing with GPT-Image-2 using masks and references. |
| 4 | `flux-image` | belt | FLUX models (Black Forest Labs). Text-to-image, image-to-image, LoRA fine-tuning, custom styles. |
| 5 | `flux-2-klein` | belt | FLUX 2 Klein 9B/4B — fast high-quality generation with style adaptation. |
| 6 | `flux-kontext` | belt | FLUX Kontext for style transfer and image transformation. |
| 7 | `nano-banana` | belt | Google Gemini native image models (Gemini 3 Pro Image, Gemini 2.5 Flash Image). |
| 8 | `nano-banana-2` | belt | Enhanced Gemini image generation with better text rendering. |
| 9 | `nano-banana-edit` | belt | Gemini image editing with multi-image input and mask support. |
| 10 | `p-image` | belt | Pruna P-Image models — fast optimized image generation based on FLUX. |
| 11 | `qwen-image-2` | belt | Alibaba Qwen-Image-2.0 — fast generation with complex text rendering. |
| 12 | `qwen-image-2-pro` | belt | Qwen-Image-2.0-Pro — professional text rendering, fine-grained realism. |
| 13 | `ai-image-generation` | runcomfy | Smart router across FLUX, Nano Banana, GPT Image, Seedream, Qwen, Wan. |
| 14 | `gpt-taste` | — | Elite UX/UI & GSAP Motion Engineer. AIDA page structure, editorial typography, gapless bento grids. |
| 15 | `imagegen-frontend-web` | — | Generate premium website design references as separate section images. |

### 🎬 AI VIDEO GENERATION (12)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 16 | `google-veo` | belt | Google Veo 3.1/3/2. Text-to-video, cinematic output, high quality. |
| 17 | `seedance` | belt | ByteDance Seedance 2.0 — T2V, I2V, R2V with synchronized audio, 1080p. |
| 18 | `seedance-v2` | belt | Seedance 2.0 Pro with studio variants for portrait consistency. |
| 19 | `kling-3-0` | belt | Kling 3.0 video generation — high quality AI video. |
| 20 | `wan-2-7` | belt | Wan 2.7 — open-source video generation with audio support. |
| 21 | `happyhorse` | belt | Alibaba HappyHorse 1.0 — T2V, I2V, R2V, video editing with natural language. |
| 22 | `happyhorse-1-0` | belt | HappyHorse 1.0 specific implementation. |
| 23 | `p-video` | belt | Pruna P-Video and WAN models — fast optimized video generation. |
| 24 | `ai-video-generation` | runcomfy | Smart router for video models across RunComfy catalog. |
| 25 | `image-to-video` | runcomfy | Animate still images — HappyHorse I2V, Wan 2.7 lip-sync, Seedance 2.0 Pro. |
| 26 | `video-edit` | runcomfy | Edit existing video — Wan 2.7 restyle, Kling motion control, Lucy restyle. |
| 27 | `video-extend` | runcomfy | Extend video clips with AI generation. |

### 🗣️ AI VOICE & AUDIO (18)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 28 | `elevenlabs-tts` | belt | ElevenLabs TTS — 22+ premium voices, 32 languages, stability/style control. |
| 29 | `elevenlabs-stt` | belt | ElevenLabs Scribe v1/v2 — 98%+ accuracy, 90+ languages, diarization, forced alignment. |
| 30 | `elevenlabs-dialogue` | belt | Multi-speaker dialogue generation — different voices in single audio file. |
| 31 | `elevenlabs-dubbing` | belt | Auto dubbing — translate/dub into 29 languages preserving speaker voice. |
| 32 | `elevenlabs-music` | belt | AI music generation — text-to-music, up to 10 min, commercial license. |
| 33 | `elevenlabs-music-generation` | belt | ElevenLabs Music, Diffrythm, Tencent Song Generation. |
| 34 | `elevenlabs-sound-effects` | belt | AI sound effects from text — foley, ambient, cinematic. |
| 35 | `elevenlabs-voice-changer` | belt | Transform voice while preserving speech content and emotion. 70+ languages. |
| 36 | `elevenlabs-voice-isolator` | belt | Remove background noise, isolate vocals from audio. |
| 37 | `ai-voice-cloning` | belt | Multiple TTS — Inworld TTS-2 (100+ languages), ElevenLabs, Kokoro, DIA. |
| 38 | `text-to-speech` | belt | Comprehensive TTS — Inworld, ElevenLabs, DIA, Kokoro, Chatterbox, Higgs. |
| 39 | `speech-to-text` | belt | ElevenLabs Scribe + Whisper — transcription, translation, diarization. |
| 40 | `ai-music` | runcomfy | AI music generation via RunComfy smart router. |
| 41 | `ai-music-generation` | belt | ElevenLabs Music, Diffrythm, Tencent Song Generation. |
| 42 | `ai-podcast` | — | Multi-person talking head podcast videos from scratch. |
| 43 | `ai-podcast-creation` | belt | AI podcasts with TTS, music, audio editing. Multi-voice conversations. |
| 44 | `dialogue-audio` | — | Multi-speaker dialogue with ElevenLabs and Dia TTS. |
| 45 | `ace-step` | runcomfy | Generate, inpaint, and outpaint music with ACE Step. |

### 🖼️ IMAGE EDITING & PROCESSING (10)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 46 | `background-removal` | belt | BiRefNet background removal — product photos, portraits, transparent PNGs. |
| 47 | `image-edit` | runcomfy | General image editing via RunComfy. |
| 48 | `image-inpainting` | runcomfy | Fill/remove objects in images using AI. |
| 49 | `image-outpainting` | runcomfy | Extend image borders with AI-generated content. |
| 50 | `image-upscaling` | belt | Real-ESRGAN, Thera, Topaz, FLUX Upscaler — enhance low-res images. |
| 51 | `relight` | runcomfy | Relight images with AI. |
| 52 | `face-swap` | runcomfy | Face swapping in images and video. |
| 53 | `controlnet-pose` | runcomfy | ControlNet pose-guided image generation. |
| 54 | `lipsync` | runcomfy | Lip-sync generation for talking avatars. |
| 55 | `image-to-code` | — | Elite website image-to-code — generate design images, analyze, implement. |

### 🎙️ TALKING HEAD & AVATAR (4)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 56 | `p-video-avatar` | belt | Pruna P-Video-Avatar — portrait to speaking video with TTS. 18x faster, 6x cheaper. |
| 57 | `talking-head-production` | — | Talking head video with AI avatars, lipsync, voiceover. |
| 58 | `talking-head-recut` | — | Package talking-head video with graphic overlay cards. |
| 59 | `ai-avatar-video` | runcomfy | AI avatar, talking-head, lip-sync videos on RunComfy. |

### 🎞️ VIDEO PRODUCTION — REMOTION (12)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 60 | `remotion-create` | — | Create new Remotion video projects. |
| 61 | `remotion-render` | belt | Render React/Remotion code to MP4. All APIs supported. |
| 62 | `remotion-best-practices` | — | Router for all Remotion skills — load first. |
| 63 | `remotion-captions` | — | Transcribing, displaying and animating captions. |
| 64 | `remotion-docs` | — | Search Remotion documentation. |
| 65 | `remotion-interactivity` | — | Structure Remotion markup for interactivity. |
| 66 | `remotion-maps` | — | Remotion Map animation knowledge. |
| 67 | `remotion-markup` | — | Content, animation and effects best practices. |
| 68 | `remotion-multimedia` | — | Interacting with Mediabunny. |
| 69 | `remotion-saas` | — | Build a SaaS app with Remotion. |
| 70 | `remotion-studio` | — | Preview a Remotion video. |
| 71 | `remotion-to-hyperframes` | — | Port Remotion composition to HyperFrames HTML. |

### 🎭 HYPERFRAMES — MOTION DESIGN (10)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 72 | `hyperframes` | — | Core composition contract — data-* timing, tracks, sub-compositions. |
| 73 | `hyperframes-animation` | — | Atomic motion rules, 7 runtime adapters (GSAP, Lottie, Three.js, etc). 24 text effects. |
| 74 | `hyperframes-audio` | — | Audio integration for HyperFrames. |
| 75 | `hyperframes-cli` | — | HyperFrames CLI tools. |
| 76 | `hyperframes-core` | — | Composition structure, timing attributes, tracks, variables. |
| 77 | `hyperframes-creative` | — | Non-animation creative direction — palettes, typography, narration. |
| 78 | `hyperframes-keyframes` | — | Keyframe animation for HyperFrames. |
| 79 | `hyperframes-registry` | — | Install/discover/wire registry blocks and components. |
| 80 | `motion-doctrine` | — | GATEWAY — vector law, seam gate, ban on idle wobble. Load FIRST. |
| 81 | `cut-the-curve` | — | Five velocity-matched seams plus waterfall entry and nudge curve. |

### 💻 WEB DEVELOPMENT & DEPLOYMENT (15)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 82 | `deploy-to-vercel` | — | Deploy apps to Vercel — preview unless production requested. |
| 83 | `vercel-cli-with-tokens` | — | Vercel CLI with token-based auth. |
| 84 | `vercel-optimize` | — | Vercel cost/performance optimization. |
| 85 | `vercel-react-best-practices` | — | React/Next.js performance from Vercel Engineering. |
| 86 | `vercel-react-native-skills` | — | React Native on Vercel. |
| 87 | `vercel-react-view-transitions` | — | React View Transition API for smooth animations. |
| 88 | `vercel-composition-patterns` | — | Vercel composition patterns. |
| 89 | `frontend-design` | — | Distinctive visual design — aesthetic direction, typography. |
| 90 | `web-artifacts-builder` | — | Create HTML artifacts with React, Tailwind, shadcn/ui. |
| 91 | `web-design-guidelines` | — | Review UI for Web Interface Guidelines compliance. |
| 92 | `webapp-testing` | — | Test web apps using Playwright. |
| 93 | `shadcn` | — | Manage shadcn components — add, search, fix, debug, style. |
| 94 | `ui-styling` | — | shadcn/ui + Tailwind CSS styling. |
| 95 | `image-to-code` | — | Elite website image-to-code. |
| 96 | `chat-ui` | — | Chat UI building blocks for React/Next.js. |

### 🎨 DESIGN SYSTEMS & UI/UX (12)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 97 | `design-system` | — | Token architecture — three-layer tokens, CSS variables, spacing scales. |
| 98 | `design` | — | Comprehensive design — brand identity, logo (55 styles), CIP, presentations, banners, icons. |
| 99 | `design-taste-frontend` | — | Anti-slop frontend — landing pages, portfolios, redesigns. |
| 100 | `design-taste-frontend-v1` | — | Original v1 taste-skill for backward compatibility. |
| 101 | `ui-ux-pro-max` | — | UI/UX intelligence — 79 styles, 192 palettes, 74 font pairings, 119 UX guidelines. |
| 102 | `high-end-visual-design` | — | High-end agency design — fonts, spacing, shadows, animations. |
| 103 | `minimalist-ui` | — | Clean editorial — warm monochrome, typographic contrast, flat bento grids. |
| 104 | `industrial-brutalist-ui` | — | Raw mechanical — Swiss typography, military terminal aesthetics. |
| 105 | `oversized-cursor` | — | Oversized macOS cursor technique for HyperFrames launch videos. |
| 106 | `stitch-design-taste` | — | Semantic Design System for Google Stitch. |
| 107 | `landing-page-design` | — | Landing page conversion — hero section, CTA psychology, F-pattern. |
| 108 | `banner-design` | — | Design banners — 12+ styles (minimalist, gradient, bold, photo, illustrated, etc). |

### 📝 CONTENT & COPYWRITING (15)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 109 | `seo-content-brief` | belt | SEO brief with keyword research, SERP analysis, heading hierarchy. |
| 110 | `linkedin-content` | belt | LinkedIn posts — hook formulas, algorithm signals, content pillars. |
| 111 | `twitter-thread-creation` | — | Twitter/X threads — hook tweets, structure, engagement. |
| 112 | `twitter-automation` | belt | Automate Twitter/X — post, like, retweet, DM, follow. |
| 113 | `press-release-writing` | — | AP-style press releases — inverted pyramid, datelines, quotes. |
| 114 | `case-study-writing` | — | B2B case studies with STAR framework, data visualization. |
| 115 | `technical-blog-writing` | — | Technical blog posts — structure, code examples, developer audience. |
| 116 | `newsletter-curation` | — | Newsletter curation — content sourcing, editorial structure, growth. |
| 117 | `content-repurposing` | — | Content atomization — blog→thread, podcast→blog, video→quotes. |
| 118 | `product-changelog` | — | Product changelogs — categorization, user-facing language, visuals. |
| 119 | `internal-comms` | — | Internal comms — status reports, leadership updates, FAQs. |
| 120 | `competitor-teardown` | — | Competitive analysis — feature matrices, SWOT, positioning maps. |
| 121 | `customer-persona` | — | Customer personas — demographics, psychographics, journey mapping. |
| 122 | `prompt-engineering` | — | Master prompting — chain-of-thought, few-shot, system prompts. |
| 123 | `product-hunt-launch` | — | Product Hunt optimization — taglines, gallery, launch tactics. |

### 🎨 BRANDING & IDENTITY (5)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 124 | `brand` | — | Brand voice, visual identity, messaging, asset management. |
| 125 | `brand-guidelines` | — | Apply Anthropic's brand colors and typography. |
| 126 | `brandkit` | — | Premium brand-kit — logo systems, identity decks, visual presentations. |
| 127 | `logo-design-guide` | — | Logo design principles and AI generation best practices. |
| 128 | `og-image-design` | — | Open Graph image design — platform specs, text placement. |

### 📊 DATA & ANALYTICS (3)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 129 | `data-visualization` | — | Chart selection, color theory, annotation — storytelling with data. |
| 130 | `algorithmic-art` | — | Algorithmic art using p5.js with seeded randomness. |
| 131 | `canvas-design` | — | Visual art in .png/.pdf — posters, art, static pieces. |

### 🔧 DEVELOPMENT TOOLS (20)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 132 | `implement` | — | Implement work from spec/tickets with TDD, typechecking, review. |
| 133 | `implement-spec` | — | Implement a specification in code. |
| 134 | `tdd` | — | Test-driven development — red-green-refactor. |
| 135 | `test-driven-development` | — | TDD before writing implementation code. |
| 136 | `code-review` | — | Two-axis review: Standards + Spec. Parallel sub-agents. |
| 137 | `receiving-code-review` | — | Handle review feedback with technical rigor. |
| 138 | `requesting-code-review` | — | Use before merging to verify work. |
| 139 | `diagnosing-bugs` | — | Diagnosis loop for hard bugs and performance regressions. |
| 140 | `systematic-debugging` | — | Structured debugging before proposing fixes. |
| 141 | `safe-debug` | — | Conservative diagnosis for DL research failures. |
| 142 | `safe-refactor` | — | Restructure code preserving behavior with verification. |
| 143 | `surgical-patch` | — | Fix bugs at narrowest responsible layer. |
| 144 | `investigate-first` | — | Diagnose ambiguous failures before editing. |
| 145 | `resolving-merge-conflicts` | — | Resolve git merge/rebase conflicts. |
| 146 | `finishing-a-development-branch` | — | Decide integration when work is complete. |
| 147 | `using-git-worktrees` | — | Feature work isolation via git worktree. |
| 148 | `git-guardrails-claude-code` | — | Block dangerous git commands. |
| 149 | `setup-pre-commit` | — | Husky pre-commit hooks with lint-staged. |
| 150 | `setup-ts-deep-modules` | — | dependency-cruiser for deep module enforcement. |

### 🏗️ ARCHITECTURE & PLANNING (10)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 151 | `brainstorming` | — | **MUST use before any creative work** — explore intent, requirements, design. |
| 152 | `prototype` | — | Throwaway prototype — LOGIC or UI branch. |
| 153 | `codebase-design` | — | Design deep modules — interfaces, seams, testability. |
| 154 | `domain-modeling` | — | Build domain model — terminology, CONTEXT.md, ADRs. |
| 155 | `analyze-project` | — | Read-only deep analysis of DL research repos. |
| 156 | `repo-intake-and-plan` | — | Scan repo, extract commands, return reproduction plan. |
| 157 | `improve-codebase-architecture` | — | Scan for deepening opportunities, present as HTML report. |
| 158 | `redesign-existing-projects` | — | Upgrade websites to premium quality. |
| 159 | `lean-build` | — | Build features with high overbuilding risk — strict scope. |
| 160 | `wayfinder` | — | Plan huge work as shared map of decision tickets. |

### 🔍 RESEARCH & INVESTIGATION (5)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 161 | `research` | — | Investigate against primary sources, write findings to Markdown. |
| 162 | `web-search` | belt | Web search with Tavily and Exa — AI-powered, content extraction. |
| 163 | `ai-rag-pipeline` | belt | RAG pipelines — research, fact-checking, grounded responses. |
| 164 | `ai-research-explore` | — | Rigor Explore — novel DL research candidates. |
| 165 | `ai-research-reproduction` | — | Rigor Reproduce — README-first DL repo reproduction. |

### 🧪 TESTING & VERIFICATION (5)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 166 | `verification-before-completion` | — | Run verification before claiming work is complete. |
| 167 | `verify-and-stop` | — | Prove work meets acceptance without expanding scope. |
| 168 | `webapp-testing` | — | Test web apps using Playwright — screenshots, logs. |
| 169 | `grill-me` | — | Relentless interview to sharpen plan or design. |
| 170 | `grill-with-docs` | — | Relentless interview creating ADRs and glossary. |

### 📄 DOCUMENTS & PRESENTATIONS (8)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 171 | `pdf` | — | Read/extract/combine/split/rotate/watermark/encrypt/OCR PDFs. |
| 172 | `docx` | — | Create/read/edit Word documents — TOC, headings, tracked changes. |
| 173 | `pptx` | — | Create/read/edit PowerPoint — slides, templates, layouts. |
| 174 | `xlsx` | — | Create/read/edit spreadsheets — formulas, charts, data cleaning. |
| 175 | `slides` | — | Strategic HTML presentations with Chart.js, design tokens. |
| 176 | `pitch-deck-visuals` | — | Investor pitch deck — 12-slide framework, charts, team slides. |
| 177 | `doc-coauthoring` | — | Co-author documentation — transfer context, iterate, verify. |
| 178 | `writing-for-agents` | — | Write documents for agents — skills, AGENTS.md, CLAUDE.md. |

### 📱 SOCIAL MEDIA & MARKETING (10)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 179 | `ai-social-media-content` | belt | Content for TikTok, Instagram, YouTube, Twitter — images, videos, reels. |
| 180 | `ai-marketing-videos` | belt | Marketing videos — demos, testimonials, explainers, social ads. |
| 181 | `social-media-carousel` | — | Multi-slide carousels — layout rules, hooks, swipe psychology. |
| 182 | `email-design` | — | Email marketing — layout, subject lines, deliverability, mobile. |
| 183 | `product-photography` | belt | AI product photography — studio lighting, lifestyle, packshots. |
| 184 | `ai-product-photography` | belt | Professional AI product photos — FLUX, Imagen 3, Grok, Seedream. |
| 185 | `youtube-thumbnail-design` | — | YouTube thumbnails — dimensions, contrast, safe zones. |
| 186 | `app-store-screenshots` | — | App Store/Play Store screenshots — platform specs, device mockups. |
| 187 | `slack-gif-creator` | — | Animated GIFs optimized for Slack. |
| 188 | `changelog-video` | — | Changelog .md → branded video — square 1080, ~45-60s. |

### 🎬 VIDEO PROMPTING & SPECS (4)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 189 | `video-prompting-guide` | — | AI video prompt best practices — Veo, Seedance, Wan, Kling. |
| 190 | `video-ad-specs` | — | Video ad creation with platform specs — TikTok, IG, YouTube, FB. |
| 191 | `explainer-video-guide` | — | Explainer video production — scripting, voiceover, visuals. |
| 192 | `storyboard-creation` | — | Film/video storyboarding — shot vocabulary, continuity, layout. |

### 🤖 AI AGENT TOOLS (12)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 193 | `agent-tools` | belt | Run AI apps via inference.sh — image, video, LLMs, search, Twitter. |
| 194 | `agent-ui` | — | Batteries-included agent component — runtime, tools, streaming, approvals. |
| 195 | `tools-ui` | — | Tool lifecycle UI — pending, progress, approval, results. |
| 196 | `widgets-ui` | — | Declarative UI widgets from JSON for React/Next.js. |
| 197 | `ai-automation-workflows` | belt | Automated AI workflows — batch, scheduled, event-driven. |
| 198 | `ai-content-pipeline` | belt | Multi-step content — image→animate→voiceover→merge. |
| 199 | `building-inferencesh-apps` | — | Build/deploy apps on inference.sh — Python and Node.js. |
| 200 | `infsh-cli` | belt | inference.sh CLI — run AI apps, generate, call LLMs. |
| 201 | `javascript-sdk` | belt | @inferencesh/sdk — TypeScript SDK with streaming, tool builder. |
| 202 | `python-sdk` | belt | inferencesh Python — sync/async, streaming, tool builder. |
| 203 | `python-executor` | belt | Execute Python in sandbox — NumPy, Pandas, Playwright, 100+ libs. |
| 204 | `mcp-builder` | — | Create MCP servers for LLM interaction with external services. |

### 🏢 AZURE & CLOUD (25)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 205 | `azure-ai` | — | Azure AI: Search, Speech, OpenAI, Document Intelligence. |
| 206 | `azure-aigateway` | — | Azure API Management as AI Gateway — caching, safety, load balancing. |
| 207 | `azure-app-onboard` | — | Business idea → Azure deployment with cost estimates. |
| 208 | `azure-app-onboard-prereq` | — | Assess if code is ready for Azure deployment. |
| 209 | `azure-cloud-migrate` | — | Migrate cross-cloud workloads to Azure. |
| 210 | `azure-compliance` | — | Azure compliance/security audits + Key Vault checks. |
| 211 | `azure-compute` | — | Azure VM/VMSS — create, size, pricing, autoscale. |
| 212 | `azure-cost` | — | Azure cost management — query, forecast, optimize. |
| 213 | `azure-deploy` | — | Execute Azure deployments — azd up, terraform apply. |
| 214 | `azure-diagnostics` | — | Debug Azure production — AppLens, Monitor, health. |
| 215 | `azure-enterprise-infra-planner` | — | Enterprise Azure infrastructure — networking, identity, security. |
| 216 | `azure-kubernetes` | — | Plan/create/configure AKS clusters. |
| 217 | `azure-kusto` | — | Query Azure Data Explorer with KQL. |
| 218 | `azure-kusto-graph` | — | Build/query Kusto graphs. |
| 219 | `azure-kusto-irql` | — | IRQL queries for cybersecurity investigations. |
| 220 | `azure-kusto-irql-graph` | — | IRQL graph functions for visualization. |
| 221 | `azure-messaging` | — | Troubleshoot Azure Messaging SDKs. |
| 222 | `azure-prepare` | — | Prepare azd-based Azure projects. |
| 223 | `azure-quotas` | — | Check/manage Azure quotas. |
| 224 | `azure-reliability` | — | Assess reliability — zone redundancy, health probes. |
| 225 | `azure-resource-lookup` | — | List/find Azure resources across subscriptions. |
| 226 | `azure-resource-visualizer` | — | Generate Mermaid architecture diagrams. |
| 227 | `azure-storage` | — | Azure Storage — Blob, Files, Queue, Table, Data Lake. |
| 228 | `azure-upgrade` | — | Upgrade Azure workloads between plans/tiers/SKUs. |
| 229 | `azure-validate` | — | Pre-deployment validation — config, infrastructure, RBAC. |

### 🗂️ LARK/FEISHU SUITE (25)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 230 | `lark-approval` | — | Query/process approval tasks in Lark. |
| 231 | `lark-apps` | — | Spark/Miaoda app development — local dev, cloud gen, UI design. |
| 232 | `lark-attendance` | — | Query attendance records in Lark. |
| 233 | `lark-base` | — | Lark Base — tables, fields, records, views, formulas, dashboards. |
| 234 | `lark-calendar` | — | Manage calendar events and meeting rooms. |
| 235 | `lark-contact` | — | Lark contacts — resolve names/emails, search bots. |
| 236 | `lark-doc` | — | Lark cloud documents — read, create, edit, images. |
| 237 | `lark-drive` | — | Lark Drive — upload/download, folders, permissions, labels. |
| 238 | `lark-event` | — | Lark real-time events — IM, approvals, tasks, VC. |
| 239 | `lark-im` | — | Lark IM — messages, chat history, groups, cards. |
| 240 | `lark-mail` | — | Lark mail — draft, send, reply, search. |
| 241 | `lark-markdown` | — | Lark Markdown — view, create, edit, compare. |
| 242 | `lark-meeting` | — | Lark video meetings — records, minutes, transcripts. |
| 243 | `lark-okr` | — | Lark OKR — objectives, key results, alignment. |
| 244 | `lark-openapi-explorer` | — | Explore native Lark OpenAPI endpoints. |
| 245 | `lark-shared` | — | Lark CLI setup/auth. |
| 246 | `lark-sheets` | — | Lark spreadsheets — create, manage, formulas, charts. |
| 247 | `lark-skill-maker` | — | Create custom Lark CLI skills. |
| 248 | `lark-slides` | — | Lark slides — create/edit presentations. |
| 249 | `lark-task` | — | Lark tasks — create todos, track progress, assign. |
| 250 | `lark-whiteboard` | — | Lark whiteboard operations. |
| 251 | `lark-wiki` | — | Lark wiki — knowledge spaces, members, nodes. |
| 252 | `lark-workflow-meeting-summary` | — | Meeting minutes → structured reports. |
| 253 | `lark-workflow-standup-report` | — | Calendar + task summary for standups. |

### 🧠 AGENT MEMORY (12)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 254 | `caveman` | — | Core agent memory and learning system. |
| 255 | `caveman-commit` | — | Commit management for caveman. |
| 256 | `caveman-compress` | — | Compression for caveman memory. |
| 257 | `caveman-discover` | — | Discovery for caveman. |
| 258 | `caveman-evidence-review` | — | Evidence review for caveman. |
| 259 | `caveman-explore` | — | Read-only repo explorer — cold-start, cross-file localization. |
| 260 | `caveman-help` | — | Help system for caveman. |
| 261 | `caveman-learn` | — | Close learn loop — review token sinks, apply fixes. |
| 262 | `caveman-manage` | — | Management for caveman. |
| 263 | `caveman-optimize` | — | Optimization for caveman. |
| 264 | `caveman-review` | — | Review for caveman. |
| 265 | `caveman-setup` | — | Setup for caveman. |

### 🧩 SKILL MANAGEMENT (5)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 266 | `find-skills` | — | Discover and install skills from open ecosystem. |
| 267 | `skill-creator` | — | Create/modify skills, measure performance, run evals. |
| 268 | `related-skill` | — | Discover related skills from inference.sh registry. |
| 269 | `template-skill` | — | Template for creating new skills. |
| 270 | `writing-skills` | — | Create/edit/verify skills before deployment. |

### 🎓 EDUCATION & GUIDANCE (8)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 271 | `academy-guide` | — | Recommend Claude Academy courses and tutorials. |
| 272 | `ask-matt` | — | Router — which skill fits your situation. |
| 273 | `teach` | — | Teach user a new skill or concept. |
| 274 | `using-superpowers` | — | Establish skill usage — require invocation before any response. |
| 275 | `god-skill` | — | Portable adaptive orchestration — discover, compose, create, repair. |
| 276 | `full-output-enforcement` | — | Override truncation — enforce complete code, ban placeholders. |
| 277 | `subagent-driven-development` | — | Execute plans with independent tasks using sub-agents. |
| 278 | `dispatching-parallel-agents` | — | 2+ independent tasks without shared state. |

### 🔬 DL RESEARCH PIPELINE (8)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 279 | `ai-research-explore` | — | Rigor Explore — novel DL research candidates. |
| 280 | `ai-research-reproduction` | — | Rigor Reproduce — README-first DL repo reproduction. |
| 281 | `analyze-project` | — | Rigor Analyze — read-only audit of DL repos. |
| 282 | `env-and-assets-bootstrap` | — | Rigor Setup — conda-first environment prep. |
| 283 | `explore-code` | — | Rigor Improve — auditable candidate implementation. |
| 284 | `explore-run` | — | Rigor Run — bounded exploratory evidence. |
| 285 | `minimal-run-and-audit` | — | Rigor Run — capture evidence from smoke tests. |
| 286 | `run-train` | — | Rigor Train — conservative training execution. |

### ✍️ WRITING & EDITING (7)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 287 | `writing-beats` | — | Assemble raw material into journey of beats. |
| 288 | `writing-fragments` | — | Mine raw fragments, no structure yet. |
| 289 | `writing-shape` | — | Shape raw material into article, paragraph by paragraph. |
| 290 | `writing-guidelines` | — | Review docs for Writing Guidelines compliance. |
| 291 | `writing-plans` | — | Plan multi-step tasks before touching code. |
| 292 | `to-spec` | — | Turn conversation into spec, publish to tracker. |
| 293 | `to-tickets` | — | Break plan into tracer-bullet tickets. |

### 🧰 UTILITY (12)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 294 | `affirmations` | — | Reset trajectory when stuck/looping/demoralized. |
| 295 | `grill-me` | — | Relentless interview to sharpen plan/design. |
| 296 | `grilling` | — | Grill user relentlessly about plan/decision/idea. |
| 297 | `loop-me` | — | Grill about specs for workflows. |
| 298 | `wait-what` | — | Stop — re-pitch last message that didn't land. |
| 299 | `handoff` | — | Compact conversation into handoff document. |
| 300 | `claude-handoff` | — | Hand conversation to fresh background agent. |
| 301 | `retro` | — | Conduct retrospective on coding session. |
| 302 | `triage` | — | Move issues/PRs through triage state machine. |
| 303 | `wizard` | — | Interactive bash wizard for human-only steps. |
| 304 | `wakeup` | — | Wake up skill. |
| 305 | `to-questionnaire` | — | Turn decision into questionnaire for others. |

### 🔐 ENTRA & IDENTITY (2)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 306 | `entra-agent-id` | — | Microsoft Entra Agent Identity Blueprints, OAuth 2.0. |
| 307 | `entra-app-registration` | — | Microsoft Entra ID app registration, OAuth, MSAL. |

### 🐍 PYTHON DEPLOYMENT (2)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 308 | `python-appservice-deploy` | — | Deploy Python (Flask/Django/FastAPI) to Azure App Service. |
| 309 | `appinsights-instrumentation` | — | Instrument webapps with Azure Application Insights. |

### 🎭 SPECIALTY (8)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 310 | `character-design-sheet` | — | Character consistency — reference sheets, LoRA, turnarounds. |
| 311 | `captions-overlay` | — | Caption overlay doctrine — drop/rail/embed model. |
| 312 | `embedded-captions` | — | Embedded captions for video — timing, styling, animation. |
| 313 | `faceless-explainer` | — | Text → faceless explainer video — typography, graphics. |
| 314 | `pr-to-video` | — | GitHub PR → code-change explainer video. |
| 315 | `book-cover-design` | — | Book cover design — genres, typography, AI generation. |
| 316 | `theme-factory` | — | Theme toolkit — 10 pre-set themes or generate new ones. |
| 317 | `scaffold-exercises` | — | Create exercise directory structures. |

### 🌐 MORE SKILLS (29)

| # | Skill | CLI | Description |
|---|-------|-----|-------------|
| 318 | `figma` | — | Import Figma content into HyperFrames. |
| 319 | `media-use` | — | Agent Media OS for HyperFrames — resolve BGM, SFX, images, voice. |
| 320 | `seam-craft` | — | Render-correctness for scene-to-scene seams. |
| 321 | `motion-graphics` | — | Motion graphics knowledge. |
| 322 | `music-to-video` | — | Music track → beat-synced video. |
| 323 | `general-video` | — | General video creation. |
| 324 | `omniskill` | — | Universal skill router. |
| 325 | `codex-pet` | — | Codex pet skill. |
| 326 | `discernment-nudge` | — | Decision quality nudge. |
| 327 | `ruflo` | — | Multi-agent orchestration — 314+ MCP tools, 30+ plugins. |
| 328 | `microsoft-foundry` | — | Build/deploy/evaluate Microsoft Foundry agents and models. |
| 329 | `runcomfy-cli` | — | RunComfy CLI for AI model execution. |
| 330 | `airunway-aks-setup` | — | Set up AI Runway on AKS — cluster to running model. |
| 331 | `migration` | — | Reversible compatibility-safe transitions — schema, data, API. |
| 332 | `safe-debug` | — | Conservative diagnosis for DL failures. |
| 333 | `paper-context-resolver` | — | Resolve paper details for reproduction. |
| 334 | `slideshow` | — | Slideshow creation. |
| 335 | `cavecrew` | — | Cavecrew agent system. |
| 336 | `lark-minutes` | — | Redirects to lark-meeting. |
| 337 | `lark-note` | — | Redirects to lark-meeting. |
| 338 | `lark-vc` | — | Redirects to lark-meeting. |
| 339 | `lark-vc-agent` | — | Redirects to lark-meeting. |
| 340 | `video-inpainting` | — | Remove/replace objects in video. |
| 341 | `video-outpainting` | — | Extend video borders with AI. |
| 342 | `llm-models` | belt | Access 100+ LLMs via OpenRouter — Claude, Gemini, Kimi, GLM. |
| 343 | `nano-banana` | belt | Google Gemini native image models. |
| 344 | `nano-banana-2` | belt | Enhanced Gemini image generation. |
| 345 | `nano-banana-edit` | belt | Gemini image editing. |
| 346 | `kling-3-0` | belt | Kling 3.0 video generation. |

---

## REQUIRED TOOLS

### `belt` CLI (inference.sh)
```bash
curl -fsSL https://cli.inference.sh | sh
belt login
```

### `runcomfy` CLI
```bash
npx runcomfy@latest
```

---

## QUICK REFERENCE — SKILL TRIGGERS

When user says... | Load skill
--- | ---
"design a logo" | `logo-design-guide`, `brandkit`
"generate an image" | `gpt-image`, `flux-image`, `nano-banana`
"create a video" | `google-veo`, `seedance`, `remotion-render`
"add voiceover" | `elevenlabs-tts`, `ai-voice-cloning`
"deploy my app" | `deploy-to-vercel`
"review my code" | `code-review`
"debug this" | `diagnosing-bugs`, `systematic-debugging`
"write tests" | `tdd`, `test-driven-development`
"set up Supabase" | `supabase`
"create a presentation" | `pptx`, `slides`, `pitch-deck-visuals`
"design a website" | `frontend-design`, `ui-styling`, `shadcn`
"brainstorm ideas" | `brainstorming`
"research this topic" | `research`, `web-search`
"make a podcast" | `ai-podcast`, `ai-podcast-creation`
"create social content" | `ai-social-media-content`
"optimize SEO" | `seo-content-brief`
"manage Azure" | `azure-*` skills
"work with Lark" | `lark-*` skills
"orchestrate agents" | `dispatching-parallel-agents`, `subagent-driven-development`
"fix this bug" | `investigate-first`, `diagnosing-bugs`
"refactor code" | `safe-refactor`, `surgical-patch`
