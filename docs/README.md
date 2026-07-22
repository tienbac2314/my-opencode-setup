# Documentation

Current behavior is documented by purpose. Start with the smallest guide that answers the question.

## Guides

- [Setup and recovery](guides/setup.md): install, credentials, updates, verification, and platform notes.
- [Troubleshooting](guides/troubleshooting.md): symptom-first diagnosis and safe recovery.

## Integrations

- [Headroom](integrations/headroom.md): Desktop/TUI transport, proxy service, RTK boundary, memory policy, logs, and validation.

## Reference

- [Agents](reference/agents.md): primary agents, subagents, OMO roles, and discovery paths.
- [Local patches](reference/patches.md): maintained differences and removal conditions.
- [Upstream targets](reference/upstream.md): issue and PR ownership.
- [`config/components.json`](../config/components.json): approved versions, source commits, disabled components, and verification contracts.

## History

- [Engineering decisions](history/decisions.md): current architectural decisions, alternatives, implementation, and evidence.
- [Maintenance refactor](history/maintenance-refactor.md): migration summary, root causes, and historical boundaries.
- [Repository timeline](history/repository-timeline.md): complete narrative from initial triage setup through current architecture.
- [Architecture evolution](history/architecture-evolution.md): subsystem-by-subsystem ownership changes.
- [Incident ledger](history/incident-ledger.md): failures, rejected approaches, repairs, and present status.
- [Historical source index](history/source-index.md): 104 reachable commits and deleted-document retrieval map.

History explains current choices but does not override active source, the component manifest, or tests. Removed documents remain available through `git show`; obsolete runbooks are not restored as active guidance.
