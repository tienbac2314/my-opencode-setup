const HEADROOM_TRANSPORT_STATE = Symbol.for('headroom.opencode.transport')

function modelDiscoveryFetch() {
  const original = globalThis[HEADROOM_TRANSPORT_STATE]?.originalFetch
  return typeof original === 'function' ? original : globalThis.fetch
}

export const ModelDiscovery = async ({ client }) => {
  return {
    config: async (config) => {
      const providers = config?.provider
      if (!providers) return

      for (const [providerId, p] of Object.entries(providers)) {
        const opts = p.options || {}
        const dc = opts.modelsDiscovery || {}
        if (!dc.enabled) continue

        const baseURL = opts.baseURL
        if (!baseURL) continue

        const timeout = dc.timeout ?? 3000
        const include = dc.include ? new RegExp(dc.include, 'i') : null
        const exclude = dc.exclude ? new RegExp(dc.exclude, 'i') : null

        let models = []
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const url = `${baseURL.replace(/\/+$/, '')}/models`
            const res = await modelDiscoveryFetch()(url, {
              headers: { Authorization: `Bearer ${opts.apiKey || ''}` },
              signal: AbortSignal.timeout(timeout),
            })
            if (!res.ok) {
              if (attempt < 1) continue
              break
            }
            const body = await res.json()
            models = normalizeModelsResponse(body)
            break
          } catch {
            if (attempt === 1) {
              await client?.app?.log?.({
                body: {
                  service: 'models-discovery',
                  level: 'warn',
                  message: `Failed to fetch models for ${providerId} — keeping existing`,
                },
              })
            }
          }
        }
        
        if (providerId === '9router') {
          const fallbackModels = [
            { id: 'ag/claude-opus-4-6-thinking', caps: { vision: true, thinking: true } },
            { id: 'oc/big-pickle', caps: { vision: false } },
            { id: 'oc/deepseek-v4-flash-free', caps: { vision: true, thinking: true } },
            { id: 'oc/hy3-free', caps: { vision: true, thinking: true } },
            { id: 'oc/mimo-v2.5-free', caps: { vision: true } },
            { id: 'oc/north-mini-code-free', caps: { vision: false } },
            { id: 'oc/nemotron-3-ultra-free', caps: { vision: false } }
          ]
          for (const fm of fallbackModels) {
            if (!models.some(m => (m.id || m.name) === fm.id)) {
              models.push({
                id: fm.id,
                capabilities: {
                  ...fm.caps,
                  contextWindow: 190000,
                  maxOutput: 16384
                }
              })
            }
          }
        }

        if (!models.length) continue

        const userMeta = p.models || {}
        const built = { ...userMeta }
        const added = []
        const metadata = {}

        for (const m of models) {
          const id = m.id || m.name
          if (!id) continue
          if (id.startsWith('opencode/')) continue
          if (include && !include.test(id)) continue
          if (exclude && exclude.test(id)) continue

          const entry = { name: id }
          const caps = m.capabilities || {}

          const input = ["text"]
          if (caps.audioInput === true) input.push("audio")
          if (caps.vision !== false) input.push("image")
          if (caps.videoInput === true) input.push("video")
          if (caps.pdf === true) input.push("pdf")

          const output = ["text"]
          if (caps.audioOutput === true) output.push("audio")
          if (caps.imageOutput === true) output.push("image")

          entry.attachment = input.length > 1
          entry.modalities = { input, output }

          const inferredLimit = inferContext(id) || { context: 1000000, output: 65536 }
          entry.limit = {
            context: positiveNumber(caps.contextWindow) ?? inferredLimit.context,
            output: positiveNumber(caps.maxOutput) ?? inferredLimit.output,
          }

          const reasoning = caps.reasoning ?? caps.thinking
          if (typeof reasoning === "boolean") entry.reasoning = reasoning
          if (typeof caps.tools === "boolean") entry.tool_call = caps.tools

          const prev = userMeta[id]
          built[id] = mergeModelEntry(entry, prev)
          if (!prev) added.push(id)

          const extra = unsupportedModelMetadata(m, caps)
          if (Object.keys(extra).length) metadata[id] = extra
        }

        p.models = built

        if (added.length || Object.keys(metadata).length) {
          await client?.app?.log?.({
            body: {
              service: 'models-discovery',
              level: 'info',
              message: added.length
                ? `${providerId}: ${added.length} new models discovered`
                : `${providerId}: model metadata refreshed`,
              extra: { added, metadata },
            },
          })
        }
      }
    },
  }
}

function normalizeModelsResponse(body) {
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body)) return body
  if (body?.data && typeof body.data === "object") return [body.data]
  if (body && typeof body === "object" && (body.id || body.name)) return [body]
  return []
}

function positiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined
}

function mergeModelEntry(discovered, manual) {
  if (!manual) return discovered
  return {
    ...discovered,
    ...manual,
    limit: { ...discovered.limit, ...manual.limit },
    modalities: { ...discovered.modalities, ...manual.modalities },
  }
}

function unsupportedModelMetadata(model, capabilities) {
  const metadata = {}
  const values = {
    owned_by: model.owned_by,
    search: capabilities.search,
    thinkingFormat: capabilities.thinkingFormat,
    thinkingCanDisable: capabilities.thinkingCanDisable,
    thinkingRange: capabilities.thinkingRange,
    upstreamProvider: capabilities.upstreamProvider,
  }
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) metadata[key] = value
  }
  return metadata
}

function inferContext(id) {
  const s = id.toLowerCase()
  if (/\b(1m|1-m)\b/.test(s)) return { context: 1000000, output: 65536 }
  if (/\b(128k|131k)\b/.test(s)) return { context: 128000, output: 16384 }
  if (/\b(32k|32-k)\b/.test(s)) return { context: 32000, output: 8192 }
  return null
}
