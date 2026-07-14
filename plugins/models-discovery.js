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
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${opts.apiKey || ''}` },
              signal: AbortSignal.timeout(timeout),
            })
            if (!res.ok) {
              if (attempt < 1) continue
              break
            }
            const body = await res.json()
            models = body?.data || []
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
            { id: 'ag/gemini-3.5-flash-low', caps: { vision: true } },
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

        for (const m of models) {
          const id = m.id || m.name
          if (!id) continue
          if (id.startsWith('opencode/')) continue
          if (include && !include.test(id)) continue
          if (exclude && exclude.test(id)) continue

          const prev = userMeta[id]
          if (prev) {
            built[id] = { ...prev }
            continue
          }

          const entry = { name: id }
          const caps = m.capabilities || {}

          if (caps.vision === true) {
            entry.modalities = { input: ["text", "image"], output: ["text"] }
          } else if (caps.vision === false) {
            entry.modalities = { input: ["text"], output: ["text"] }
          } else {
            entry.modalities = { input: ["text", "image"], output: ["text"] }
          }

          if (caps.contextWindow || caps.maxOutput) {
            entry.limit = {}
            if (caps.contextWindow) entry.limit.context = caps.contextWindow
            if (caps.maxOutput) entry.limit.output = caps.maxOutput
          }

          if (caps.thinking === true) {
            entry.reasoning = true
          }

          if (!entry.limit) {
            const ctx = inferContext(id)
            if (ctx) {
              entry.limit = ctx
            } else {
              entry.limit = { context: 1000000, output: 65536 }
            }
          }

          built[id] = entry
          added.push(id)
        }

        p.models = built

        if (added.length) {
          await client?.app?.log?.({
            body: {
              service: 'models-discovery',
              level: 'info',
              message: `${providerId}: ${added.length} new models discovered`,
              extra: { added },
            },
          })
        }
      }
    },
  }
}

function inferContext(id) {
  const s = id.toLowerCase()
  if (/\b(1m|1-m)\b/.test(s)) return { context: 1000000, output: 65536 }
  if (/\b(128k|131k)\b/.test(s)) return { context: 128000, output: 16384 }
  if (/\b(32k|32-k)\b/.test(s)) return { context: 32000, output: 8192 }
  return null
}
