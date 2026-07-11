---
name: vshell
description: "Use when the user needs SSH/SFTP access through the VibeShell `vshell` CLI: list configured servers, reuse SSH sessions, run remote commands, inspect logs, deploy files, or manage remote files."
---

You have access to **VibeShell** through the `vshell` CLI. VibeShell uses saved server configs and credentials, keeps persistent reusable SSH sessions, and assigns short aliases such as `001` for follow-up commands.

## Fast Path

```bash
vshell servers
vshell ssh my-server -- hostname
vshell ssh my-server
vshell sessions
vshell ssh-session 001 -- uptime
vshell ss 001 -- journalctl -u nginx -n 200
vshell send-key 001 y enter
vshell sftp my-server ls /var/www
vshell get-content my-server /etc/nginx/nginx.conf
vshell rg my-server "listen 80" /etc/nginx
```

Most SSH, SFTP, and session commands auto-start the headless VibeShell daemon. If a command cannot communicate with the background service, check it with `vshell daemon status` and start it with `vshell daemon start`.

## Session Flow

```text
Need server name?
-> `vshell servers`

Need a one-off non-interactive command?
-> `vshell ssh <server> -- <command>`

Need a reusable shell?
-> `vshell ssh <server>`
-> by default, this reuses the earliest active session for that server

Need a fresh parallel login?
-> `vshell ssh <server> --new`
-> only do this when the user explicitly wants a new session

Need another command on the same session?
-> `vshell ssh-session <alias> -- <command>`
-> alias example: `vshell ssh-session 001 -- hostname`

Need to reattach interactively?
-> `vshell ssh-session <alias>`
-> or `vshell attach <alias>`

Need to answer a prompt?
-> `vshell send-key <alias> y enter`
-> `vshell send-key <alias> ctrl-c`

Need to list or kill sessions?
-> `vshell sessions`
-> `vshell kill <alias>`
-> `vshell kill --all`
```

Sessions persist across commands and can be reused for SSH, SFTP, and follow-up input. Idle sessions are reaped only after about 30 minutes with no clients and no activity.

## SSH Flow

### Common commands

```bash
vshell servers
vshell ssh my-server
vshell ssh my-server --new
vshell ssh --wait my-server
vshell ssh my-server -- hostname
vshell ssh my-server -- systemctl status nginx
vshell ssh-session 001 -- hostname
vshell ssh-session 001 -- ls -la /var/log
vshell ssh-session 001 --command-file ./remote-command.sh
vshell ssh-session 001 --command-stdin
vshell exec <session-id> -- hostname
vshell attach 001
vshell send-key 001 enter
vshell kill 001
```

Use `vshell ssh <server> -- <command>` when starting from a configured server name. Use `vshell ssh-session <alias> -- <command>` or `vshell exec <alias> -- <command>` when you already have an active session alias or UUID.

Use `--wait` when a flaky network, VPN, or Tailscale login may need retries. Use `--new` only for a deliberate parallel login.

### Command input without quote traps

Use exactly one command source: `-- <command>`, `--command-file <path>`, or `--command-stdin`. For commands with nested quotes, pipes, regexes, or shell scripts, prefer `--command-file` or `--command-stdin`.

Shell stdin example:

```bash
vshell ssh my-server --command-stdin <<'SH'
sh -lc 'cd /srv/app && docker compose ps && curl -fsS http://127.0.0.1:8000/health'
SH
```

PowerShell stdin example:

```powershell
@'
sh -lc 'cd /srv/app && docker compose ps && curl -fsS http://127.0.0.1:8000/health'
'@ | vshell ssh my-server --command-stdin
```

Repeatable command file examples:

```bash
vshell ssh my-server --command-file ./remote-command.sh
vshell ssh-session 001 --command-file ./remote-command.sh
```

## Interactive Command Flow

```text
IF a command may ask for Enter / y / password / confirmation
THEN run it inside the persistent shell session
AND reuse that same session for follow-up input
```

CLI prints `Next use:` hints after `vshell ssh` or when a command is waiting for more input. Follow the alias in that hint instead of starting a new connection.

Recommended follow-up commands:

```bash
vshell ssh-session 001 -- <command>
vshell ssh-session 001 --command-file ./remote-command.sh
vshell ssh-session 001
vshell send-key 001 y enter
vshell send-key 001 ctrl-c
vshell attach <session-id>
```

## SFTP Flow

```text
Need file operations?
-> use `vshell sftp <server> <operation>`
-> or reuse an alias with `vshell sftp --session <alias> <operation>`
```

```text
Need to inspect or edit text?
-> search with `vshell rg`
-> read with `vshell get-content`
-> edit existing files with `vshell edit-file`
-> create new files with `vshell add-file`
```

```text
Need to upload a whole folder?
-> `vshell sftp <server> put <local-dir> <remote-dir>`

Need repeatable deploy-style sync?
-> `vshell sftp <server> sync <local-dir> <remote-dir>`
-> pass `--delete` only when remote extras should really be removed
```

### Direct SFTP commands

```bash
vshell sftp my-server
vshell sftp my-server pwd
vshell sftp my-server ls /var/www
vshell sftp --session 001 cat /etc/nginx/nginx.conf
vshell sftp my-server get /var/log/app.log ./app.log
vshell sftp my-server put ./local-file.txt /tmp/local-file.txt
vshell sftp my-server put ./dist /var/www/app
vshell sftp my-server put ./dist /var/www/app --exclude node_modules/ --exclude .git/
vshell sftp my-server sync ./dist /var/www/app --exclude node_modules/ --no-gitignore
vshell sftp my-server sync ./dist /var/www/app --delete
vshell sftp my-server mkdir /var/www/uploads
vshell sftp my-server rm /tmp/old-file
vshell sftp my-server mv /tmp/a /tmp/b
```

### Remote text helpers

```bash
vshell rg my-server TODO /srv/app --glob "*.rs" --max-results 100
vshell rg --session 001 "listen 80" /etc/nginx -i
vshell get-content my-server /etc/nginx/nginx.conf --max-bytes 200000
vshell get-content --session 001 /var/log/app.log
vshell add-file my-server /tmp/config.yml --content-file ./config.yml --parents
vshell add-file --session 001 /tmp/config.yml --content "key: value\n" --parents --overwrite
vshell edit-file my-server /etc/app.conf --replace "debug=false" --with "debug=true"
vshell edit-file my-server /etc/app.conf --replace "old" --with "new" --all
vshell edit-file --session 001 /etc/app.conf --content-file ./app.conf
Get-Content .\config.yml | vshell edit-file my-server /etc/app.conf --content-stdin
```

## Rules

- Use the `vshell` CLI through the local shell/exec tool for VibeShell work.
- Prefer reusing an existing session over creating a new one.
- Treat `vshell ssh <server>` as a reusable-session command; only add `--new` when the user explicitly wants another parallel session.
- Prefer `vshell ssh <server> -- <command>` for non-interactive automation from a server name.
- Prefer `vshell ssh-session <alias> -- <command>` for non-interactive automation on an existing session.
- Prefer shell session reuse for interactive prompts or multi-step command flows.
- Use `rg` for remote text search before broad directory downloads.
- Use `vshell get-content` for text inspection.
- Use `vshell edit-file` for existing remote text files; prefer exact `--replace` / `--with` for small targeted edits, and full content replacement only when you intentionally own the whole file.
- Use `vshell add-file` when creating new remote text files; it fails on existing files unless `--overwrite` is explicit.
- Use `vshell sftp get` / `put` for binary or local file transfer.
- Use `vshell sftp put <local-dir> <remote-dir>` for first-time recursive folder uploads.
- Use `vshell sftp sync <local-dir> <remote-dir>` for repeatable deploy-style directory syncs.
- Directory upload/sync respects .gitignore by default when configured; pass explicit excludes for heavy or unsafe paths such as `node_modules/`, `.venv/`, `target/`, and `.git/`.
- Only use `--delete` when the user explicitly wants remote files absent locally to be removed.
- If the user provides only a host or IP, map it to a configured server first with `vshell servers`.
- If no configured server matches, ask the user to add/select a server in VibeShell.
- Credentials come from saved VibeShell configuration; do not invent ad-hoc SSH passwords or keys on the command line unless the environment already requires it.
