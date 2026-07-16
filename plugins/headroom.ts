/**
 * Auto-load the pinned Headroom transport for Desktop and CLI OpenCode.
 *
 * Provider, model, and MCP ownership remains in normal OpenCode config. The
 * bridge activates only when the independent localhost proxy is healthy and
 * otherwise fails open to direct provider traffic.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const DEFAULT_PROXY_URL = "http://127.0.0.1:8787"
type NativePlugin = (input: any, options?: Record<string, unknown>) => Promise<any>

export function resolveHeadroomMarkerPath(): string {
  return join(homedir(), ".config", "opencode", "headroom-proxy.url")
}

export function resolveHeadroomProxyUrl(markerPath = resolveHeadroomMarkerPath()): string | undefined {
  if (process.env.HEADROOM_PROXY_URL) {
    return process.env.HEADROOM_PROXY_URL.replace(/\/+$/, "")
  }
  try {
    const configured = readFileSync(markerPath, "utf8").trim()
    return configured ? configured.replace(/\/+$/, "") : DEFAULT_PROXY_URL
  } catch {
    return undefined
  }
}

export function resolveHeadroomTransportPath(): string {
  return process.env.HEADROOM_OPENCODE_PLUGIN_PATH || join(
    homedir(),
    ".cache",
    "opencode-headroom",
    "source",
    "plugins",
    "opencode",
    "dist",
    "entry.opencode.js",
  )
}

export async function isHealthyHeadroomProxy(
  proxyUrl: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(`${proxyUrl}/livez`, {
      signal: AbortSignal.timeout(250),
    })
    if (!response.ok) return false
    const health = await response.json() as { service?: string; status?: string }
    return health.service === "headroom-proxy" && health.status === "healthy"
  } catch {
    return false
  }
}

export async function waitForHealthyHeadroomProxy(
  proxyUrl: string,
  attempts = 180,
  delayMs = 250,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await isHealthyHeadroomProxy(proxyUrl, fetchImpl)) return true
    if (attempt + 1 < attempts) await Bun.sleep(delayMs)
  }
  return false
}

export const HeadroomBridgePlugin: Plugin = async (input) => {
  const proxyUrl = resolveHeadroomProxyUrl()
  if (!proxyUrl || !await waitForHealthyHeadroomProxy(proxyUrl)) return {}

  const transportPath = resolveHeadroomTransportPath()
  if (!existsSync(transportPath)) {
    await input.client?.app?.log?.({
      body: {
        service: "headroom-bridge",
        level: "warn",
        message: `Healthy Headroom proxy found but transport is missing: ${transportPath}`,
      },
    })
    return {}
  }

  const module = await import(pathToFileURL(transportPath).href)
  const nativePlugin = module.default as NativePlugin | undefined
  if (typeof nativePlugin !== "function") {
    throw new Error(`Headroom transport default export is not a plugin: ${transportPath}`)
  }
  return nativePlugin(input, { proxyUrl })
}

export default {
  id: "opencode-headroom-bridge",
  server: HeadroomBridgePlugin,
}
