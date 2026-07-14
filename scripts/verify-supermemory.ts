import { pathToFileURL } from "node:url"
import { join } from "node:path"

const configDir = process.argv[2] || join(process.env.HOME || process.env.USERPROFILE || "", ".config", "opencode")
const marker = `opencode-dotfiles-smoke-${Date.now()}-${crypto.randomUUID()}`
const modulePath = join(configDir, "node_modules", "opencode-supermemory", "dist", "index.js")
const module = await import(pathToFileURL(modulePath).href)
const plugin = module.SupermemoryPlugin
if (typeof plugin !== "function") throw new Error("SupermemoryPlugin export missing")

const hooks = await plugin({
  directory: process.cwd(),
  client: { provider: { list: async () => ({ data: { all: [] } }) } },
})
const execute = hooks.tool?.supermemory?.execute
if (typeof execute !== "function") throw new Error("supermemory tool missing")

const context = { sessionID: "supermemory-lifecycle-smoke" }
let memoryId = ""

async function call(args: Record<string, unknown>) {
  const raw = await execute(args, context)
  const text = typeof raw === "string" ? raw : raw?.output
  if (typeof text !== "string") throw new Error("Supermemory returned non-text output")
  return JSON.parse(text)
}

async function waitFor<T>(read: () => Promise<T>, matches: (value: T) => boolean, label: string) {
  const deadline = Date.now() + 30_000
  let value = await read()
  while (!matches(value) && Date.now() < deadline) {
    await Bun.sleep(1_000)
    value = await read()
  }
  if (!matches(value)) throw new Error(`${label} did not observe disposable marker within 30s`)
  return value
}

async function forget(memoryId: string) {
  return waitFor(
    () => call({ mode: "forget", memoryId, scope: "project" }),
    (value: any) => value.success === true,
    "forget request",
  )
}

try {
  const added = await call({ mode: "add", content: marker, scope: "project", type: "project-config" })
  if (!added.success) throw new Error(`add failed: ${added.error}`)
  memoryId = added.id || added.memoryId || ""

  const searched = await waitFor(
    () => call({ mode: "search", query: marker, scope: "project", limit: 10 }),
    (value: any) => value.success && value.results?.some((item: any) => item.content?.includes(marker)),
    "search",
  )
  memoryId ||= searched.results.find((item: any) => item.content?.includes(marker))?.id || ""

  const profile = await call({ mode: "profile" })
  if (!profile.success) throw new Error(`profile failed: ${profile.error}`)

  const listed = await call({ mode: "list", scope: "project", limit: 50 })
  if (!listed.success || !Array.isArray(listed.memories)) throw new Error(`list failed: ${listed.error}`)
  if (!memoryId) throw new Error("memory ID missing; cannot clean up")

  await forget(memoryId)
  memoryId = ""

  await waitFor(
    () => call({ mode: "search", query: marker, scope: "project", limit: 10 }),
    (value: any) => value.success && !value.results?.some((item: any) => item.content?.includes(marker)),
    "forget",
  )
  console.log("Supermemory lifecycle: add/search/profile/list/forget passed")
} finally {
  if (memoryId) {
    await forget(memoryId).catch(() => undefined)
  }
}
