# Isolated Headroom Launcher Implementation Record

Purpose: record implemented files, decisions, and checks so future updates do not reintroduce persistent Headroom routing.

Status: implemented in `be3ef35577ca04c29f6a680f55169deae6fedaf5`.

## Implemented Files

- `scripts/install-headroom-plugin.ps1`: fetch exact `HEADROOM_GIT_COMMIT`, detached checkout, install dependencies, build native OpenCode entrypoint.
- `scripts/start-opencode-headroom.ps1`: validate JSON args, inspect resolved providers, start/reuse proxy, inject process-local routing, run OpenCode, restore environment, verify config hashes, stop owned proxy.
- `config/versions.env.example`: documents tested full Headroom source commit.
- `tests/headroom-launcher.test.ts`: guards isolation and argument contract.
- `README.md`, `setup.md`, `knownbug.md`, `pr.md`: usage, update, troubleshooting, and ownership notes.

## Decisions Reached During Implementation

1. Persistent `provider.headroom` removed because it required special model names and did not start proxy.
2. Global `headroom wrap` rejected because user wanted normal App/TUI unaffected.
3. 9router-specific routing rejected. Launcher derives every remote provider from resolved config.
4. Direct PowerShell remainder args rejected because OpenCode flags were consumed by launcher binding. JSON array preserves exact child arguments.
5. Native plugin source pinned by full commit because plugin is not published as npm package.
6. Metadata logging enabled without message logging to prove interception without storing prompts.

## Verified Behavior

- Native plugin built successfully from commit `4e30dde2aca801c6dbdcdc78412132805c496bb4`.
- 9router request logged model `oc/deepseek-v4-flash-free` with original base URL `https://tienbac.dpdns.org`.
- Native OpenCode request logged provider `zen`, model `deepseek-v4-flash-free`, original path `/zen/v1/chat/completions`, and base URL `https://opencode.ai`.
- Both model calls returned requested exact marker.
- Active config hashes remained unchanged.
- Launcher-owned port 8787 listener count returned to zero.
- Headroom launcher tests and full repository suite passed at implementation time.

## Update Procedure

1. Review upstream proxy and `plugins/opencode` changes.
2. Set private `HEADROOM_GIT_COMMIT` to full reviewed commit.
3. Run installer and focused launcher tests.
4. Run live 9router and native OpenCode marker requests.
5. Confirm metadata records both original upstreams and no prompt text.
6. Confirm config hashes and listener cleanup.
7. Update tracked example pin and this record only after proof passes.

Rollback: close launched OpenCode and delete `$HOME\.cache\opencode-headroom`. Normal OpenCode config needs no restoration.
