export const ModelDiscovery = async ({ client }) => {
  return {
    config: async (config) => {
      const providers = config?.provider
      if (!providers) return

      // Fire discovery in background — never block server startup
      discoverModels(providers, client).catch(() => {})
    },
  }
}

async function discoverModels(providers, client) {
      for (const [providerId, p] of Object.entries(providers)) {
        const opts = p.options || {}
        const dc = opts.modelsDiscovery || {}
        if (!dc.enabled) continue

        const baseURL = opts.baseURL
        if (!baseURL) continue

        const timeout = dc.timeout ?? 10000
        const include = dc.include ? new RegExp(dc.include, 'i') : null
        const exclude = dc.exclude ? new RegExp(dc.exclude, 'i') : null

        let models = []
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const url = `${baseURL.replace(/\/+$/, '')}/models`
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${opts.apiKey || ''}` },
              signal: AbortSignal.timeout(timeout),
            })
            if (!res.ok) {
              if (attempt < 2) continue
              break
            }
            const body = await res.json()
            models = body?.data || []
            break
          } catch {
            if (attempt === 2) {
              await client?.app?.log?.({
                body: {
                  service: 'models-discovery',
                  level: 'warn',
                  message: `Failed to fetch models for ${providerId} after 3 attempts`,
                },
              })
            }
          }
        }

        if (!models.length) continue

        const userMeta = p.models || {}
        const built = {}
        const added = []
        const removed = []

        for (const m of models) {
          const id = m.id || m.name
          if (!id) continue
          if (include && !include.test(id)) continue
          if (exclude && exclude.test(id)) continue

          const prev = userMeta[id]
          built[id] = prev ? { ...prev } : { name: id }
          if (!built[id].limit) {
            const ctx = inferContext(id)
            if (ctx) built[id].limit = ctx
          }
          added.push(id)
        }

        for (const id of Object.keys(userMeta)) {
          if (!built[id]) removed.push(id)
        }

        p.models = built

        if (added.length || removed.length) {
          await client?.app?.log?.({
            body: {
              service: 'models-discovery',
              level: 'info',
              message: `${providerId}: ${added.length} models, ${removed.length} stale removed`,
              extra: { added, removed },
            },
          })
        }
      }
}

function inferContext(id) {
  const s = id.toLowerCase()
  if (/\b(1m|1-m)\b/.test(s)) return { context: 1000000, output: 65536 }
  if (/\b(128k|131k)\b/.test(s)) return { context: 128000, output: 16384 }
  if (/\b(32k|32-k)\b/.test(s)) return { context: 32000, output: 8192 }
  return null
}
