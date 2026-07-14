# Goal and Headroom Integration Implementation Plan

> Superseded historical draft. Goal runtime now uses `plugins/goal.ts`; Headroom final design is recorded in `2026-07-14-isolated-headroom-launcher.md`. Do not implement persistent provider steps below.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Goal plugin and configure Headroom with strict provider-level isolation.

**Architecture:** We use npm configuration pins for `@prevalentware/opencode-goal-plugin` and add a standalone `headroom` provider mapping to the local Headroom proxy at port 8787.

**Tech Stack:** Node.js, Bun, OpenCode plugins and providers.

## Global Constraints
- Do not modify existing `9router` config values or baseURL.
- Clean up any unused files.
- Run tests using `bun test` and verify active config files.

---

### Task 1: Add Goal Plugin Versions and Package Scaffolding

**Files:**
- Modify: `C:\Users\bacnt\opencode-dotfiles\config\versions.env.example`
- Modify: `C:\Users\bacnt\opencode-dotfiles\bootstrap.ps1`

**Interfaces:**
- Consumes: None
- Produces: `OPENCODE_GOAL_PLUGIN_VERSION` env mapping in bootstrap

- [ ] **Step 1: Read config/versions.env.example**
- [ ] **Step 2: Add `OPENCODE_GOAL_PLUGIN_VERSION=0.1.24` to versions.env.example**
- [ ] **Step 3: Modify bootstrap.ps1 to parse `OPENCODE_GOAL_PLUGIN_VERSION` and add `"@prevalentware/opencode-goal-plugin" = $versions.OPENCODE_GOAL_PLUGIN_VERSION` to package.json dependencies**
- [ ] **Step 4: Rerun bootstrap.ps1 to verify dependencies install**
- [ ] **Step 5: Verify via `bun pm ls` inside active config directory**

### Task 2: Configure Goal Plugin and Commands

**Files:**
- Modify: `C:\Users\bacnt\opencode-dotfiles\config\opencode.jsonc.example`
- Modify: `C:\Users\bacnt\opencode-dotfiles\config\tui.json`

**Interfaces:**
- Consumes: Installed `@prevalentware/opencode-goal-plugin`
- Produces: Goal command definition and plugin listing in active configs

- [ ] **Step 1: Edit config/opencode.jsonc.example to add `"@prevalentware/opencode-goal-plugin@0.1.24"` to `"plugin"` array and define `"command.goal"`**
- [ ] **Step 2: Edit config/tui.json to add `"@prevalentware/opencode-goal-plugin@0.1.24"` to `"plugin"` array and define `"command.goal"`**
- [ ] **Step 3: Edit `bootstrap.ps1` to restore and pin `@prevalentware/opencode-goal-plugin` in TUI and global configs**
- [ ] **Step 4: Rerun bootstrap to propagate configuration**
- [ ] **Step 5: Verify configuration using `opencode debug config` counts**

### Task 3: Integrate Isolated Headroom Provider

**Files:**
- Modify: `C:\Users\bacnt\opencode-dotfiles\config\opencode.jsonc.example`

**Interfaces:**
- Consumes: Externally running Headroom proxy
- Produces: `headroom` provider mapping targeting port 8787

- [ ] **Step 1: Edit config/opencode.jsonc.example to add the `"headroom"` provider configuration**
- [ ] **Step 2: Add model fallback lists for headroom models**
- [ ] **Step 3: Propagate template changes via bootstrap.ps1**
- [ ] **Step 4: Verify `9router` provider options remain intact**

### Task 4: Documentation and Verification Runbook

**Files:**
- Modify: `C:\Users\bacnt\opencode-dotfiles\pr.md`
- Modify: `C:\Users\bacnt\opencode-dotfiles\setup.md`

- [ ] **Step 1: Document Goal plugin version and verification tests**
- [ ] **Step 2: Document Headroom configuration, setup, and isolation proof steps**
- [ ] **Step 3: Perform final test run check**
