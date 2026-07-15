import { join } from "node:path"
import { writeFileSync, unlinkSync } from "node:fs"

const home = process.env.HOME || process.env.USERPROFILE || ""
const cacheDir = process.argv[2] || join(home, ".cache", "opencode")
const packageRoot = join(cacheDir, "packages", "@prevalentware", "opencode-goal-plugin@0.1.24")

const code = String.raw`
const { testRender } = await import("@opentui/solid")
const { writeFileSync } = await import("node:fs")
const mode = process.argv[2]
const statePath = process.argv[3]
process.env.OPENCODE_GOAL_STATE_PATH = statePath
const goal = {
  sessionID: "goal-smoke", objective: "verify Goal sidebar", status: "active", tokenBudget: null,
  tokensUsed: 0, timeUsedSeconds: 0, createdAt: 1, updatedAt: 1, completionEvidence: null, blocker: null,
  closedAt: null, continuationFailures: 0, lastStatus: "Goal set.", maxAutoTurns: null,
  maxDurationSeconds: null, noProgressTokenThreshold: 50, maxNoProgressTurns: 2, noProgressTurns: 0,
  budgetWrapupSent: false, stopReason: null, history: [], checkpoints: [], lastCheckpoint: null,
  lastAssistantText: "", lastAssistantMessageID: "", lastPromptAgent: "build",
  awaitingContinuationProgress: false, continuationBaselineMessageID: "", continuationBaselineSummary: "",
  autoTurns: 0, lastContinuationAt: null, lastAccountedAt: Math.floor(Date.now() / 1000),
  remainingTokens: null, sampledAt: Math.floor(Date.now() / 1000),
}
const fileActive = mode === "file-active"
writeFileSync(
  statePath,
  mode === "tool-active"
    ? "invalid"
    : fileActive
      ? JSON.stringify({ version: 1, goals: { "goal-smoke": goal } })
      : JSON.stringify({ version: 1, goals: {} }),
)
const goalModule = await import("./node_modules/@prevalentware/opencode-goal-plugin/src/tui.tsx")
const persisted = await goalModule.persistedGoals()
if (fileActive && persisted?.["goal-smoke"]?.objective !== goal.objective) throw new Error("Goal state file was not read")
let parts = mode === "tool-active"
  ? [{ type: "tool", tool: "create_goal", state: { status: "completed", output: JSON.stringify({ goal }) } }]
  : []
let sidebar
const lifecycle = []
const api = {
  renderer: { requestRender() {} },
  lifecycle: { onDispose(fn) { lifecycle.push(fn) } },
  slots: { register(input) { sidebar = input.slots.sidebar_content; return "goal-smoke" } },
  command: { register() { return () => {} } },
  route: { current: { name: "session", params: { sessionID: "goal-smoke" } } },
  ui: { toast() {}, dialog: { setSize() {}, replace() {}, clear() {} }, DialogSelect() { return null } },
  theme: { current: { text: "#ffffff", textMuted: "#888888", primary: "#00ff00" } },
  state: { session: { messages() { return [{ id: "goal-message" }] } }, part() { return parts } },
  kv: { get(_key, fallback) { return fallback }, set() {} },
}
await goalModule.default.tui(api, undefined, undefined)
await Bun.sleep(100)
if (typeof sidebar !== "function") throw new Error("Goal sidebar slot did not register")
const active = mode === "tool-active" || mode === "file-active"
if (!active) {
  const goals = await goalModule.persistedGoals()
  if (goals?.["goal-smoke"]) throw new Error(mode + ": inactive Goal state should be absent")
  for (const dispose of lifecycle) dispose()
  console.log(mode)
  process.exit(0)
}
const app = await testRender(() => sidebar({}, { session_id: "goal-smoke" }), { width: 42, height: 14 })
const expected = ["● Goal active", "Status: active", "verify Goal sidebar"]
let output = ""
const deadline = Date.now() + 2000
while (Date.now() < deadline) {
  output = app.captureCharFrame()
  if (expected.every((text) => output.includes(text))) break
  await Bun.sleep(25)
}
if (!expected.every((text) => output.includes(text))) {
  throw new Error(mode + ": expected Goal sidebar text missing: " + expected.join(", ") + "\n" + output)
}
for (const dispose of lifecycle) dispose()
console.log(mode)
process.exit(0)
`

const smoke = join(packageRoot, ".goal-tui-smoke.tsx")
const state = join(packageRoot, ".goal-tui-state.json")
writeFileSync(smoke, code)
try {
  for (const mode of ["empty", "tool-active", "file-active", "file-cleared"]) {
    const result = Bun.spawnSync(["bun", smoke, mode, state], { cwd: packageRoot, stdout: "pipe", stderr: "pipe" })
    if (result.exitCode !== 0) {
      process.stderr.write(result.stderr)
      process.exit(result.exitCode)
    }
  }
  console.log("Goal TUI: active states visible; empty and cleared states hidden")
} finally {
  unlinkSync(smoke)
  try { unlinkSync(state) } catch {}
}
