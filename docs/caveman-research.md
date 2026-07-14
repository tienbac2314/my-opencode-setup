# Caveman Mode: Cross-Model Research Findings

This research note explains why the repository uses short, direct writing rules and which wording patterns failed across different models. It is background evidence, not OpenCode setup guidance; start with [README.md](../README.md) for the live project.

Research date: 2026-07-11
Sources: [caveman repo](https://github.com/JuliusBrussee/caveman) (87.8k stars), [arXiv:2604.00025](https://arxiv.org/abs/2604.00025), caveman issues #629/#665/#677/#679/#680

## Core Problem

Same caveman instruction produces different behavior across models. Goal: one compressed instruction that works everywhere.

## Model Behavior Matrix

| Model | Pattern-as-Structure | Bracket Literal? | Drift? | Tokenizer-Aware? |
|---|---|---|---|---|
| Claude Opus 4.6/4.8 | Strong | No | Low | Yes |
| Claude Sonnet 4.6 | Strong | No | Low | Yes |
| Claude Fable 5 | Strong | No | **High** (harness conflict) | Yes |
| GPT-5 / Codex | Strong | No | Unknown | Yes |
| Gemini 2.5/3.5 Flash | **Weak** | **Yes** | Likely | Weak |
| Gemini Pro | Medium | Probably no | Moderate | Probably |
| DeepSeek V3 | Adequate | No | Possibly | Weak |
| Llama 3.x (small) | Adequate | Possibly (1B/3B) | Unknown | Weak |
| Qwen | Adequate | Anecdotal yes | Unknown | Weak |
| GLM-4/5/5.2/5.5 | Untested | Unknown | Unknown | Unknown |

## Key Failure Modes

### 1. Bracket Literalization (Gemini Flash, small models)
Pattern `[thing] [action] [reason]` gets copied verbatim:
```
[component re-renders] [because new ref] [fix with useMemo]
```
**Fix:** Use concrete Not/Yes examples instead of bracket templates.

### 2. Instruction Drift (Fable 5, long sessions)
Fable 5 harness system prompt directly contradicts caveman mechanics:
> "Being readable and being concise are different things, and readability matters more."
Model silently reverts to verbose over turns.
**Fix:** Use `lite` level on Fable-class. "ACTIVE EVERY RESPONSE" combats drift.

### 3. Over-Stripping (Korean/Japanese/agglutinative)
"Drop articles" applied to case particles (이/가/을/를/은/는, は/が/を/に) — breaks comprehension.
**Fix:** Scope article-dropping to article-languages only. Compress filler/predicates, not grammar.

### 4. Invented Abbreviations Save Nothing
`cfg`/`impl`/`req`/`res`/`fn` under BPE tokenizers (o200k_base, Claude's tokenizer): same or more subword pieces as full word. Zero token savings, decode clarity cost.
**Fix:** Explicit "do NOT invent abbreviations" rule with rationale.

### 5. Arrow Chains
`X → Y` — arrow glyph is its own token. Saves nothing. Fable 5 harness explicitly blocklists arrows.
**Fix:** Write `X caused Y` or `X. Y because…`.

### 6. Auto-Clarity Language Leak
On non-English sessions, auto-clarity warnings sometimes emit in English (copied from SKILL.md example).
**Fix:** Mark auto-clarity example as language-flexible, not English-canonical.

### 7. Explanatory Content Inflation (issue #677)
Caveman compresses diagnostic/factual responses (-33.6%) but **inflates** explanatory content (+7.5% to +29.5%). Model compensates for compression by over-explaining.

## What Works Universally

1. **"ACTIVE EVERY RESPONSE"** + kill-switch "normal mode" — combats drift across all models
2. **Concrete Not/Yes examples** — prevents literalization on all models
3. **"Keep code/errors/paths byte-exact"** — universally respected
4. **Short synonyms** (`fix` not `implement a solution`, `big` not `extensive`) — works everywhere
5. **"Lead with conclusion"** — understood by all instruction-tuned models

## What Does NOT Work Universally

1. Bracket patterns `[thing] [action]` — literalized by Flash/small models
2. Arrows `→` — own token, some harnesses ban
3. Prose abbreviations `cfg`/`impl` — zero savings, decode cost
4. Blanket "drop articles" — breaks agglutinative languages

## arXiv Finding (2604.00025)

"Brevity Constraints Reverse Performance Hierarchies in Language Models" — 31 models tested. Constraining large models to brief answers **improved accuracy ~26 points** on some benchmarks. Terseness is not just cheaper but sometimes more correct.

## Token Economics (from HONEST-NUMBERS.md)

- Caveman skill adds ~1-1.5k input tokens per turn
- Output reduction: 65% average (range 22-87%)
- Net-negative when normal replies are <1.5k output tokens
- Net-positive for verbose workloads (explanations, reviews, architecture)
- Whole-session savings: ~14-21% on output-heavy workloads
