# Supermemory Server Embedding

Current remote server (`161.118.215.190`) uses **Gemini Embedding 2 Preview** through the OpenAI-compatible proxy at `tienbac.dpdns.org`. Credentials remain machine-local.

## Config

### systemd service (`/etc/systemd/system/supermemory.service`)

```
Environment=SUPERMEMORY_EMBEDDING_PROVIDER=openai
Environment=SUPERMEMORY_EMBEDDING_MODEL=gemini-embedding-2-preview
Environment=SUPERMEMORY_EMBEDDING_DIMENSIONS=768
Environment=SUPERMEMORY_EMBEDDING_BASE_URL=https://tienbac.dpdns.org/v1
Environment=OPENAI_API_KEY=<set outside Git>
```

### `embedding-plan.json` (`/home/ubuntu/.supermemory/embedding-plan.json`)

```json
{
  "provider": "openai",
  "modelId": "gemini-embedding-2-preview",
  "dimensions": 768,
  "baseUrl": "https://tienbac.dpdns.org/v1"
}
```

## Utility scripts (on VPS at `~/scripts/`)

| Script | What it does |
|--------|-------------|
| `verify-embedding.py` | Ping `/v1/embeddings`, print dims & model name |
| `list-proxy-models.py` | List all models advertised at the proxy (`/v1/models`) |

Wipe after model change: `sudo systemctl stop supermemory.service && sudo rm -f /home/ubuntu/.supermemory/data && sudo systemctl start supermemory.service`

## Caveats

- **Re-ingestion required on model change.** Old and new vectors live in different model spaces even at same dimensions. Search returns empty results for old data. Use the wipe command above, then re-save memories.
- The `env.enc` file holds encrypted config from first-boot wizard. Env vars in systemd override it at runtime.
- Never commit an API key. The key previously written in the draft appeared in chat output and must be rotated before relying on it again.
