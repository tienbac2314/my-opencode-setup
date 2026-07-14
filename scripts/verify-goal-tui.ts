import { join } from "node:path"
import { writeFileSync, unlinkSync } from "node:fs"

const home = process.env.HOME || process.env.USERPROFILE || ""
const cacheDir = process.argv[2] || join(home, ".cache", "opencode")
const packageRoot = join(cacheDir, "packages", "@prevalentware", "opencode-goal-plugin@0.1.24")

const code = String.raw`
const { testRender } = await import("@opentui/solid")
const plugin = (await import("./node_modules/@prevalentware/opencode-goal-plugin/src/tui.tsx")).default
const mode = process.argv[2]
let parts = mode === "active" ? [{ type: "tool", tool: "create_goal", state: { status: "completed", output: JSON.stringify({ goal: {
  sessionID: "goal-smoke", objective: "verify Goal sidebar", status: "active", tokenBudget: null,
  tokensUsed: 0, timeUsedSeconds: 0, createdAt: 1, updatedAt: 1, completionEvidence: null, blocker: null,
  closedAt: null, continuationFailures: 0, lastStatus: "Goal set.", maxAutoTurns: null,
  maxDurationSeconds: null, noProgressTokenThreshold: 50, maxNoProgressTurns: 2, noProgressTurns: 0,
  budgetWrapupSent: false, stopReason: null, history: [], checkpoints: [], lastCheckpoint: null,
  lastAssistantText: "", lastAssistantMessageID: "", autoTurns: 0, lastContinuationAt: null,
  remainingTokens: null, sampledAt: Math.floor(Date.now() / 1000),
} }) } }] : []
let sidebar
const api = {
  slots: { register(input) { sidebar = input.slots.sidebar_content; return "goal-smoke" } },
  command: { register() { return () => {} } },
  route: { current: { name: "session", params: { sessionID: "goal-smoke" } } },
  ui: { toast() {}, dialog: { setSize() {}, replace() {}, clear() {} }, DialogSelect() { return null } },
  theme: { current: { text: "#ffffff", textMuted: "#888888", primary: "#00ff00" } },
  state: { session: { messages() { return [{ id: "goal-message" }] } }, part() { return parts } },
  kv: { get(_key, fallback) { return fallback }, set() {} },
}
await plugin.tui(api, undefined, undefined)
if (typeof sidebar !== "function") throw new Error("Goal sidebar slot did not register")
const app = await testRender(() => sidebar({}, { session_id: "goal-smoke" }), { width: 42, height: 14 })
const expected = mode === "active" ? ["Status: active", "verify Goal sidebar"] : ["Goal", "No active goal"]
let output = ""
try {
  const deadline = Date.now() + 2000
  while (Date.now() < deadline) {
    output = app.captureCharFrame()
    if (expected.every((text) => output.includes(text))) break
    await Bun.sleep(25)
  }
} finally {
  app.renderer.destroy()
}
if (mode === "active") {
  if (!output.includes("Status: active") || !output.includes("verify Goal sidebar")) throw new Error("Goal active state missing")
} else if (!output.includes("Goal") || !output.includes("No active goal")) {
  throw new Error("Goal empty state missing")
}
console.log(mode)
process.exit(0)
`

const smoke = join(packageRoot, ".goal-tui-smoke.ts")
writeFileSync(smoke, code)
try {
  for (const mode of ["empty", "active"]) {
    const result = Bun.spawnSync(["bun", smoke, mode], { cwd: packageRoot, stdout: "pipe", stderr: "pipe" })
    if (result.exitCode !== 0) {
      process.stderr.write(result.stderr)
      process.exit(result.exitCode)
    }
  }
  console.log("Goal TUI: empty and active sidebar states passed")
} finally {
  unlinkSync(smoke)
}
