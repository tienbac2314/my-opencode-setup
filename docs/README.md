# Documentation

Current behavior is documented by purpose. Start with the smallest guide that answers the question.

## Guides

- [Setup and recovery](guides/setup.md): install, credentials, updates, verification, and platform notes.
- [Troubleshooting](guides/troubleshooting.md): symptom-first diagnosis and safe recovery.

## Integrations

- [Headroom](integrations/headroom.md): Desktop/TUI transport, proxy service, RTK boundary, memory policy, logs, and validation.
- [Supermemory server embedding](integrations/supermemory-server-embedding.md): self-hosted embedding configuration and re-ingestion rules.

## Reference

- [Agents](reference/agents.md): primary agents, subagents, OMO roles, and discovery paths.
- [Local patches](reference/patches.md): maintained differences and removal conditions.
- [Upstream targets](reference/upstream.md): issue and PR ownership.
- [`config/components.json`](../config/components.json): approved versions, source commits, disabled components, and verification contracts.

## History

- [Engineering decisions](history/decisions.md): current architectural decisions, alternatives, implementation, and evidence.
- [Maintenance refactor](history/maintenance-refactor.md): migration summary, root causes, and historical boundaries.

History explains current choices but does not override active source, the component manifest, or tests. Removed documents remain available through `git show`; obsolete runbooks are not restored as active guidance.
