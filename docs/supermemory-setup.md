# Self-Hosting SuperMemory Setup Guide

This guide details how to install, configure, and route a self-hosted **SuperMemory** instance on a Linux VPS and integrate it with your local **OpenCode** client.

---

## 1. VPS Installation

SuperMemory runs as a single compiled Bun-based binary. 

Log in to your Linux VPS and execute the official installer script:
```bash
curl -fsSL https://supermemory.ai/install | bash
```

The binary will be installed to:
`/home/ubuntu/.supermemory/bin/supermemory-server`

---

## 2. Environment Configuration

SuperMemory reads configuration from `~/.supermemory/env` at startup.

Create or update `/home/ubuntu/.supermemory/env` to use your custom OpenAI-compatible proxy (e.g. 9router):

```env
OPENAI_BASE_URL="https://tienbac.dpdns.org/v1"
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
OPENAI_MODEL="opencode/deepseek-v4-flash-free"
PORT=6767
```

* **OPENAI_BASE_URL**: Points to your LLM proxy.
* **OPENAI_API_KEY**: Your API key.
* **OPENAI_MODEL**: The model used for memory summarization/extraction.
* **PORT**: The port SuperMemory server will listen on.

---

## 3. Registering the systemd Daemon Service

To ensure SuperMemory runs in the background, starts on boot, and automatically restarts if it crashes, register it as a systemd service.

Create the service file `/etc/systemd/system/supermemory.service`:
```ini
[Unit]
Description=SuperMemory Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/.supermemory/bin/supermemory-server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Reload, enable, and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable supermemory
sudo systemctl start supermemory
```

To verify logs and retrieve the generated API key:
```bash
sudo journalctl -u supermemory -f
```

*(Copy the generated `api key` shown in the startup box: it will look like `sm_xxxxxxxxx`)*.

---

## 4. Exposing via Cloudflare Tunnel (PM2)

If you use a local `cloudflared` config managed via PM2 (e.g. `omni-tunnel`), add a hostname mapping to route public traffic to port `6767`.

1. **Add DNS Route**:
   Register your new subdomain CNAME record via the cloudflared CLI on the VPS:
   ```bash
   cloudflared tunnel route dns <TUNNEL_ID_OR_NAME> supermemory.tienbac.dpdns.org
   ```

2. **Add Ingress Rule**:
   Edit your local Cloudflare configuration file (e.g., `/home/ubuntu/.cloudflared/config.yml`):
   ```yaml
   ingress:
      - hostname: supermemory.tienbac.dpdns.org
        service: http://127.0.0.1:6767
      ...
     ...
   ```

3. **Restart the PM2 Tunnel**:
   Restart your PM2 tunnel app to apply changes:
   ```bash
   pm2 restart omni-tunnel
   ```

---

## 5. Local Client Configuration

OpenCode now uses **SuperMemory** exclusively. Mem0 has been archived to `mem0-archive/` in the dotfiles repo for historical reference. No toggle needed.
2. Automatically disables/enables the conflicting context window recovery hooks in `oh-my-opencode-slim.json`.
3. Cleans up/creates the required skills junctions inside `~/.config/opencode/skills`.

---

## 6. Local Configuration File

Open `~/.config/opencode/supermemory.jsonc` (created automatically by bootstrap or toggle scripts) and paste your VPS details:

```json
{
  "apiKey": "sm_su5ztRs6pktbeD6YPBtrSi_r4XjELT6grEigI5BYxjgc0hphfEKYrzLkrkIJ5Hd2674jHeVCz5SlrL6U7f0peG7",
  "baseUrl": "https://supermemory.tienbac.dpdns.org"
}
```

Restart **OpenCode** to load the new plugin and enjoy fast, reliable memory!
