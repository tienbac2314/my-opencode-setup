# OMO Slim Direct Image Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve attached image payloads for native-vision models by making OMO Slim direct image routing an explicit managed default.

**Architecture:** The tracked OMO Slim JSON remains the sole repository authority and setup/maintenance continue copying it to the global OpenCode config. Tests lock the property and deployment behavior; current docs explain interception, precedence, provider requirements, and the decision boundary without patching OMO Slim.

**Tech Stack:** JSON, PowerShell deployment scripts, Bun tests, Markdown.

## Global Constraints

- Keep upstream `oh-my-opencode-slim@2.2.1` source/package vanilla.
- Change only `image_routing`; leave `autoUpdate`, presets, fallback, MCPs, tools, skills, and disabled agents unchanged.
- Preserve single-commit delivery with complete commit rationale.
- Never include credential values or a full resolved OpenCode config in documentation or command output.

---

### Task 1: Manage direct image routing and document ownership

**Files:**
- Modify: `tests/models-discovery.test.ts`
- Modify: `tests/maintain.test.ts`
- Modify: `config/oh-my-opencode-slim.json`
- Modify: `docs/reference/agents.md`
- Modify: `README.md`
- Modify: `docs/guides/setup.md`
- Modify: `docs/guides/troubleshooting.md`
- Modify: `docs/history/decisions.md`
- Create: `docs/superpowers/specs/2026-07-19-omo-direct-image-routing-design.md`
- Create: `docs/superpowers/plans/2026-07-19-omo-direct-image-routing.md`

**Interfaces:**
- Consumes: tracked OMO configuration deployed by `setup.ps1` and `maintain.ps1`.
- Produces: top-level JSON property `image_routing: "direct"` in tracked and deployed OMO configuration.

- [ ] **Step 1: Add failing tracked-config assertion**

Add this assertion after parsing `config/oh-my-opencode-slim.json` in `tests/models-discovery.test.ts`:

```ts
expect(omoConfig.image_routing).toBe("direct")
```

- [ ] **Step 2: Add failing setup-convergence assertion**

In the isolated setup convergence test in `tests/maintain.test.ts`, parse the deployed file and assert:

```ts
const deployedOmo = JSON.parse(readFileSync(join(configDir, "oh-my-opencode-slim.json"), "utf8"))
expect(deployedOmo.image_routing).toBe("direct")
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```powershell
C:\Users\bacnt\Downloads\w\nodejs\node_modules\bun\bin\bun.exe test tests/models-discovery.test.ts tests/maintain.test.ts
```

Expected: failure because `image_routing` is absent.

- [ ] **Step 4: Add minimal managed configuration**

Add one top-level property after `setDefaultAgent` in `config/oh-my-opencode-slim.json`:

```json
"image_routing": "direct",
```

- [ ] **Step 5: Document active policy and diagnosis**

Update current docs with these exact conclusions:

- `auto` saves attachments, removes image parts, and injects Observer delegation when Observer is enabled.
- `direct` preserves the original image payload for OpenCode/provider delivery.
- selected provider/model must support images.
- explicit `@observer` remains available.
- project-local OMO config and global JSONC can override global JSON.
- no OMO source/package patch is introduced.

Add a dated entry to `docs/history/decisions.md` with problem, alternatives, decision, implementation paths, reproducible evidence, and supersession condition.

- [ ] **Step 6: Deploy managed config and verify active property**

Run:

```powershell
pwsh -NoProfile -File .\setup.ps1 -SkipRtk -SkipCodeGraph -SkipTests -SkipEnvironment
```

Expected: setup succeeds and active `~/.config/opencode/oh-my-opencode-slim.json` contains `image_routing: direct` without changing credential files.

- [ ] **Step 7: Run focused and full verification**

Run:

```powershell
C:\Users\bacnt\Downloads\w\nodejs\node_modules\bun\bin\bun.exe test tests/models-discovery.test.ts tests/maintain.test.ts
C:\Users\bacnt\Downloads\w\nodejs\node_modules\bun\bin\bun.exe test
pwsh -NoProfile -File .\maintain.ps1 verify
```

Expected: all tests pass. Manifest/config verification reports no drift unless
the active machine retains an intentional untracked plugin override; report
that override without changing repository ownership or deleting user config.

- [ ] **Step 8: Commit once with complete rationale**

```powershell
git add README.md config/oh-my-opencode-slim.json tests/models-discovery.test.ts tests/maintain.test.ts docs/reference/agents.md docs/guides/setup.md docs/guides/troubleshooting.md docs/history/decisions.md docs/superpowers/specs/2026-07-19-omo-direct-image-routing-design.md docs/superpowers/plans/2026-07-19-omo-direct-image-routing.md
git commit -m "fix(omo): Preserve native image payloads" -m "Set managed OMO Slim image routing to direct so vision-capable 9router models receive original image attachments instead of Observer delegation text. Document config precedence, model capability requirements, unchanged vanilla package behavior, evidence, and supersession conditions. Add tracked/deployed config regressions and verify setup convergence."
```

Expected: one commit containing configuration, tests, design, implementation plan, and current decision documentation.

## Execution evidence

- RED: focused tests failed because tracked and deployed `image_routing` were `undefined`.
- GREEN: 29 focused tests passed after the one-property config change.
- Full suite: 81 tests passed, 0 failed, 487 assertions.
- Active deployment: tracked and active OMO configs both report `direct`; neither explicitly sets `autoUpdate`; no higher-precedence project/global JSONC file exists.
- Maintenance verification: repository tests pass, then resolved plugin count reports 9 versus manifest 8 because active global config intentionally retains the user's local Goal fork. The Goal override was preserved and manifest ownership was not changed for this OMO task.
