# OMO Slim Direct Image Routing Design

Date: 2026-07-19
Status: approved for implementation

## Problem

The managed OMO Slim configuration omits `image_routing`. In installed OMO
Slim 2.2.1, the effective `auto` path processes incoming image attachments when
Observer is enabled. The hook saves image data under OpenCode's image storage,
removes binary image parts from the model request, and appends text instructing
the active agent to delegate image reading to `@observer`.

This prevents a vision-capable active model, including models reached through
9router, from receiving the original image payload. Provider and model vision
support cannot help after the plugin has removed the attachment.

## Decision

Set top-level `"image_routing": "direct"` in
`config/oh-my-opencode-slim.json`, the repository authority copied to the active
global OpenCode configuration.

Direct mode exits the attachment-processing hook before mutation. Original
image parts remain in the message sent through OpenCode and 9router. Observer
remains available for explicit delegation but is no longer forced for every
attachment.

No OMO Slim source patch or package fork is introduced. `autoUpdate` remains at
vanilla behavior. Existing agent presets, model pins, MCP grants, fallback
behavior, and disabled-agent policy remain unchanged.

## Configuration flow

1. Repository authority: `config/oh-my-opencode-slim.json`.
2. `setup.ps1` and OMO maintenance apply copy that file to
   `~/.config/opencode/oh-my-opencode-slim.json`.
3. OMO Slim reads `image_routing: direct` and preserves binary image parts.
4. OpenCode forwards those parts to the selected provider/model.

Project-local OMO configuration or a global `oh-my-opencode-slim.jsonc` can
take precedence over the managed global JSON file. Troubleshooting must call
out this precedence when direct routing appears ineffective.

## Tradeoffs

- Native vision works only when the selected provider/model accepts image
  input. A text-only model may reject the request or fail to interpret it.
- Images are sent to the configured provider instead of being kept out of the
  primary model request and delegated to Observer.
- Explicit `@observer` delegation remains possible when specialized visual
  analysis is preferred.

These tradeoffs are intentional: model selection owns vision capability, while
OMO Slim must not silently replace the user's image payload.

## Documentation

Update current operator documentation to record:

- why `auto` blocked native vision;
- why `direct` is the managed default;
- the exact managed and active config paths;
- Observer remains optional and explicit;
- selected model/provider must support images;
- project-local/JSONC precedence can override the managed JSON file.

Record the architecture decision in `docs/history/decisions.md` with evidence
and a supersession condition. Do not rewrite historical OMO records that remain
factually correct for earlier repository states.

## Verification

- Parse tracked config and assert `image_routing === "direct"`.
- Run setup convergence in an isolated config and assert deployed OMO config
  retains direct routing.
- Compare tracked and active OMO configuration after deployment.
- Run repository tests.
- Live acceptance: attach an image to a vision-capable 9router model and confirm
  the model receives/analyzes it without injected `@observer` delegation text.

## Supersession

Reconsider this decision when OMO Slim offers capability-aware routing that can
reliably preserve direct delivery for vision-capable models without payload
loss, or when OpenCode provides a stronger per-model attachment-routing policy.
