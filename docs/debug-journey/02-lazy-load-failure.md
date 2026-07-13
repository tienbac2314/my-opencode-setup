# Lazy-load failure

## Intended protocol

`opencode-lazy-load` intercepts provider responses, detects requested tools, resolves schemas, and rewrites direct tool calls only when required. It must preserve every normal streamed tool-call frame.

Standard SSE can split one call across frames:

```text
data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"load_tool","arguments":"{\"name\":"}}]}}]}
data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"codegraph_explore\"}"}}]}}]}
```

Provider can also end with empty delta:

```text
data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}
```

DSML providers may express same request as tagged text:

```text
<tool_call><name>load_tool</name><arguments>{"name":"codegraph_explore"}</arguments></tool_call>
```

## Failure

Broken tip `c286bb890666528fbdfed486f1851b1226a075b6` buffered stream fragments while attempting case-insensitive DSML recognition. Classification occurred before complete standard SSE tool-call arguments were assembled. Some fragments were consumed as candidate DSML, then never emitted. App and TUI saw finish reason without complete `load_tool` arguments.

Repeated plugin initialization added second failure. Process-global guards prevented hook registration in later App sessions even though each session received new plugin lifecycle.

## Repair

Commit `c6541213e37538fe76ff3e2ff247f6a6e9176faf` separates stream handling into three outcomes:

1. Proven standard SSE tool-call events preserve tool names, arguments, ordering, and finish state after parse/reserialize.
2. Incomplete candidate data remains buffered until classification is possible.
3. Proven DSML is parsed and rewritten through direct-call path.

Commit `03db0fda4f03580217bb2f5ac5d467af8ac6e83a` scopes initialization to plugin lifecycle instead of permanent process-global state.

DSML response names resolve against original tool names case-insensitively. Direct `load_tool` execution remains case-sensitive and returns explicit unknown-tool output. Calls with no justified rewrite preserve tool semantics.

## Regression coverage

Nine lazy-load tests cover repeated initialization, split standard calls, namespaced gateway calls, direct unloaded-tool rewrite, terminal reset, MCP passthrough, false gateway-name matches, ordinary content/reasoning, and split DSML. Full repository suite reports 14 tests and 42 assertions.
