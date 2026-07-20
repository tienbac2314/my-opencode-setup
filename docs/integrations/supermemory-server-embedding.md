# Supermemory Server Embedding

The Oracle VPS uses Supermemory's default local embedding model. Nginx remains the authenticated public edge; Supermemory listens behind it on port `6769`. Credentials remain machine-local.

## Active configuration

### systemd service (`/etc/systemd/system/supermemory.service`)

```ini
Environment=SUPERMEMORY_EMBEDDING_PROVIDER=local
Environment=SUPERMEMORY_EMBEDDING_MODEL=Xenova/bge-base-en-v1.5
Environment=SUPERMEMORY_EMBEDDING_DIMENSIONS=768
Environment=SUPERMEMORY_DATA_DIR=/home/ubuntu/.supermemory-local
```

The local model needs no embedding API key or base URL. First boot downloads about 106 MB into `/home/ubuntu/.supermemory-local/models`.

Nginx listens on loopback port `6767` and proxies to Supermemory on port `6769`. A new data directory generates a new Supermemory API key; rotate the Nginx-injected key, user `SUPERMEMORY_API_KEY`, and `~/.config/opencode/supermemory.jsonc` together without printing the value. Restart OpenCode afterward so existing processes do not retain the old key.

## Model migration boundary

Supermemory locks provider, model, and dimensions in the data directory. Equal dimensions do not make vectors from different models comparable. A model change must use a fresh data directory or a deliberate backup-and-re-ingestion migration.

The previous Gemini store remains at `/home/ubuntu/.supermemory`; do not delete it during routine recovery. Current local-model data lives at `/home/ubuntu/.supermemory-local`.

VPS rebuild references and the July 20 recovery scripts live under `/home/ubuntu/oracle-vps-setup`. The legacy tunnel bundle moved intact to its `proxy_setup/` child; that tree contains private SSH keys and is mode `0700`/`0600`, so it must never enter a public repository unchanged.

## July 20 incident

The remote `gemini-embedding-2-preview` route often exceeded Supermemory 0.0.5's approximately 800 ms primary embedding deadline. Logs showed embedding timeouts and `VectorDB upsert failed`; document status could still become `done` while search returned zero results. Nginx authentication and direct embedding responses were healthy, so changing proxy/auth handling would not fix retrieval.

The service moved to the documented local default instead of relaxing an undocumented timeout. Live proof through the public endpoint passed add, indexing, search, deletion, and user-preference retrieval. Post-cutover logs contained no embedding timeout or vector-upsert failure.

## Recovery checks

1. Confirm `systemctl is-active supermemory` and the ready log identifies `local · Xenova/bge-base-en-v1.5 · 768d`.
2. Confirm Nginx configuration validates before reload.
3. Compare API-key values by hash or equality only; never print them.
4. Run `bun ./scripts/verify-supermemory.ts "$HOME/.config/opencode"` from a fresh OpenCode environment.
5. Treat `done` as insufficient evidence after an embedding incident; require a unique add → search → forget lifecycle.

## Backup, rollback, and upgrades

- Before changing the server binary, unit, embedding plan, or data directory, keep a root-only copy of the systemd unit and preserve both data directories.
- Rollback means restoring the matching provider/model/data-directory tuple. Do not point the Gemini store at the local model or mix their vectors.
- A new data directory also creates a new server API key. Nginx and every OpenCode client must rotate together.
- Server upgrades do not justify changing embeddings. Review release notes, back up the unit/data, confirm the active embedding tuple after restart, and rerun the complete disposable lifecycle.
- Supermemory 0.0.5's bundled interactive SDK embedding path uses an approximately 800 ms hardcoded deadline. The binary exposes no supported environment override. Do not patch the compiled timeout; use the local model or a measured upstream release that changes this behavior explicitly.

## VPS rebuild material

`/home/ubuntu/oracle-vps-setup` contains the legacy proxy/tunnel bundle, reusable Supermemory inspection utilities, and the July 20 recovery artifacts. The folder is reference material rather than a live service root. Run `/home/ubuntu/oracle-vps-setup/verify-layout.sh` after reorganizing it.

The `proxy_setup/Keys` subtree contains private SSH keys. A future public VPS-setup repository must exclude that subtree and any generated credential-transfer files before its first commit.

## Caveats

- `Xenova/bge-base-en-v1.5` is English-focused. Use a fresh store and full re-ingestion before adopting a multilingual model.
- `env.enc` holds encrypted first-boot configuration; systemd environment variables override it at runtime.
- Never commit, log, or paste an API key.
