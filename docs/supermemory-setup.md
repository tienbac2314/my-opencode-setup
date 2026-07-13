# Supermemory Deployment and OpenCode Integration

## Local OpenCode Client

Bootstrap installs `plugins/supermemory.ts`, installs `opencode-supermemory`, and creates `~/.config/opencode/supermemory.jsonc` only when missing.

```json
{
  "apiKey": "sm_your_api_key_here",
  "baseUrl": "https://supermemory.example.com"
}
```

Keep real API key outside Git. Restart both OpenCode TUI and Desktop App after changing client configuration.

Current package exposes `SupermemoryPlugin` as named export. Local wrapper supplies default `{ id, server }` object required by OpenCode plugin discovery.

## Oracle VPS Reference Deployment

Current verified deployment differs from discarded repository instructions:

- `supermemory.service` runs `/home/ubuntu/.supermemory/bin/supermemory-server` under systemd.
- Server listens on `127.0.0.1:6767`.
- Runtime state and encrypted configuration live under `/home/ubuntu/.supermemory/`.
- Configuration is stored encrypted; do not create documented plaintext `env` files unless a future server version explicitly requires them.
- `cloudflared.service` owns public tunnel. PM2 does not manage this tunnel.
- Public hostname routes to `http://127.0.0.1:6767`.

Do not copy service tokens, API keys, auth secrets, or encrypted configuration into this repository.

## Health Checks

Run through Vshell from trusted local workstation:

```powershell
vshell ssh "Oracle VPS" -- systemctl is-active supermemory
vshell ssh "Oracle VPS" -- systemctl is-enabled supermemory
vshell ssh "Oracle VPS" -- systemctl is-active cloudflared
vshell ssh "Oracle VPS" -- journalctl -u supermemory -n 100 --no-pager
```

Expected service state: `active` and `enabled`, with zero restart loop. Root endpoint must return HTTP 200 from both VPS-local and public routes.

## Functional Check

Health status alone is insufficient. Validate through OpenCode plugin:

1. Add temporary uniquely tagged memory.
2. Search exact marker.
3. Read profile and list output.
4. Forget temporary memory.
5. Search again and verify marker is absent.

This proves authentication, tunnel routing, API compatibility, storage, retrieval, and deletion.

## Current Operational Warning

Server `0.0.5` logs repeated Better Auth magic-link advisory warnings. They do not currently stop memory requests, but server upgrade should be evaluated against upstream release notes. Historical `401 Unauthorized` entries require timestamp correlation; recent successful plugin calls prove current credentials work.

## Upstream References

- [Supermemory repository](https://github.com/supermemoryai/supermemory)
- [Supermemory API quickstart](https://supermemory.ai/docs/quickstart)
- [Supermemory changelog](https://supermemory.ai/docs/changelog/overview)

Official platform documentation now describes Docker-based self-hosting. This VPS still runs earlier standalone binary deployment; do not replace it during routine client maintenance without separate migration plan and backup.
