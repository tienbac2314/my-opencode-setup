# Reference-baseline comparison

This historical note explains what the clean `workathome\.config` comparison proved and what it could not prove. For current setup steps, use [setup.md](../../setup.md).

## Reference

`C:\Users\bacnt\Desktop\workathome\.config` was gold-standard bare configuration. It demonstrated provider and base-config health independently from broken repository history.

## What comparison established

| Area | Reference finding | Recovery consequence |
| --- | --- | --- |
| Configuration root | Native Windows config path and base files load | Preserve path and minimal base structure |
| Provider | 9router credentials, URL, and model routing work | Diagnose failures above provider layer |
| Bare startup | OpenCode starts without repository custom stack | Add plugins one boundary at a time |
| Custom lazy load | No equivalent repository stream transformer exists | Rebuild from source and tests; do not copy from baseline |
| Plugin lifecycle | Full restored eight-origin stack is absent | Validate repeated initialization separately |
| Memory migration | Baseline does not prove Supermemory adapter or Mem0 removal | Verify current wrapper and remote lifecycle independently |

## What comparison did not establish

Reference configuration did not supply lazy-load mechanics or prove repository history, plugin upgrades, Desktop lifecycle, Supermemory migration, or Oracle VPS alignment. Those claims required source reconstruction and separate tests.

## Trace method

1. Compare plugin origin lists and order.
2. Compare local loader entry points and hook exports.
3. Trace `load_tool` from request construction through stream transform and tool registry lookup.
4. Launch fresh CLI, TUI, and Desktop processes to expose lifecycle-state leakage.
5. Query remote Supermemory health and compare endpoint configuration.

## Rejected assumptions

Copying reference directory wholesale was rejected because it would discard repository-specific model filtering, RTK guard behavior, package pins, and Supermemory migration. Replaying all post-baseline commits was rejected because their interaction produced failure being removed.
