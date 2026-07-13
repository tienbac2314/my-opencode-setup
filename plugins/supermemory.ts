import type { Plugin } from "@opencode-ai/plugin"
import { SupermemoryPlugin } from "opencode-supermemory"

export default {
  id: "opencode-supermemory",
  server: SupermemoryPlugin as Plugin,
}
