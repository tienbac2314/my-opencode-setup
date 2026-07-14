# Debug journey

This directory records repository failure, diagnosis, recovery, and validation. It is historical evidence, not current setup guidance.

## Boundaries

| Boundary | Commit | Meaning |
| --- | --- | --- |
| Stable baseline | `d8fa757af2f97a640610fb00e32d4d811a255fab` | Last trusted pre-migration tree |
| Broken-tree tip | `c286bb890666528fbdfed486f1851b1226a075b6` | Last commit preserved on archive branch |
| Restored runtime tip | `03db0fda4f03580217bb2f5ac5d467af8ac6e83a` | Plugin lifecycle preservation fix |
| Broken-doc archive | `archive/broken-docs-reference` | Read-only access to discarded lineage |

## Reading order

- [Tree corruption and recovery boundary](01-tree-corruption.md)
- [Lazy-load failure](02-lazy-load-failure.md)
- [Reference-baseline comparison](03-baseline-comparison.md)
- [Recovery validation](04-recovery-validation.md)
- [Desktop plugin-list override incident](../../knownbug.md#desktop-plugin-list-hidden-by-project-override)

## Recovered runtime sequence

| Commit | Purpose |
| --- | --- |
| `18089e825b2f9f4d2554db540ee93143c996d814` | Recovery plan |
| `e72ff2c2cda8e7e0030f310709bf121c3eb953c9` | Rebuilt plugin stack |
| `c6541213e37538fe76ff3e2ff247f6a6e9176faf` | Preserved streamed tool calls |
| `2f4d06f3a1475c8e2ca8653889ac17bcbb50eee5` | Normalized plugin loading |
| `03db0fda4f03580217bb2f5ac5d467af8ac6e83a` | Preserved plugin lifecycle |

Final Desktop incident: project `.opencode/opencode.json` used `"plugin": []`, hiding status entries while eight `plugin_origins` and `load_tool` remained healthy. Current tree omits that property, and `tests/bootstrap.test.ts` prevents it from returning. No lazy-load or Supermemory rollback was required.

Current operation belongs in [README](../../README.md), [setup](../../setup.md), [patch requirements](../../pr.md), and [known bugs](../../knownbug.md).
