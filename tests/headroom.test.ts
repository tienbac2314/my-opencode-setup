import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  isHealthyHeadroomProxy,
  resolveHeadroomProxyUrl,
  waitForHealthyHeadroomProxy,
} from "../plugins/headroom"

const directories: string[] = []
const previousProxyUrl = process.env.HEADROOM_PROXY_URL

afterEach(() => {
  if (previousProxyUrl === undefined) delete process.env.HEADROOM_PROXY_URL
  else process.env.HEADROOM_PROXY_URL = previousProxyUrl
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("Headroom Desktop and CLI bridge", () => {
  test("stays disabled without service marker or environment override", () => {
    delete process.env.HEADROOM_PROXY_URL
    const directory = mkdtempSync(join(tmpdir(), "headroom-bridge-"))
    directories.push(directory)

    expect(resolveHeadroomProxyUrl(join(directory, "missing-marker"))).toBeUndefined()
  })

  test("reads proxy URL from service marker", () => {
    delete process.env.HEADROOM_PROXY_URL
    const directory = mkdtempSync(join(tmpdir(), "headroom-bridge-"))
    directories.push(directory)
    const marker = join(directory, "headroom-proxy.url")
    writeFileSync(marker, "http://127.0.0.1:9876/\n")

    expect(resolveHeadroomProxyUrl(marker)).toBe("http://127.0.0.1:9876")
  })

  test("accepts only healthy Headroom service responses", async () => {
    const healthy = async () => new Response(JSON.stringify({
      service: "headroom-proxy",
      status: "healthy",
    }))
    const unrelated = async () => new Response(JSON.stringify({
      service: "other",
      status: "healthy",
    }))

    expect(await isHealthyHeadroomProxy("http://127.0.0.1:8787", healthy as typeof fetch)).toBe(true)
    expect(await isHealthyHeadroomProxy("http://127.0.0.1:8787", unrelated as typeof fetch)).toBe(false)
  })

  test("waits through a login startup race and then fails open", async () => {
    let attempts = 0
    const eventuallyHealthy = async () => {
      attempts++
      return new Response(JSON.stringify({
        service: "headroom-proxy",
        status: attempts >= 3 ? "healthy" : "starting",
      }))
    }

    expect(await waitForHealthyHeadroomProxy(
      "http://127.0.0.1:8787", 3, 0, eventuallyHealthy as typeof fetch,
    )).toBe(true)
    expect(attempts).toBe(3)
    expect(await waitForHealthyHeadroomProxy(
      "http://127.0.0.1:8787", 1, 0, async () => { throw new Error("offline") },
    )).toBe(false)
  })
})
