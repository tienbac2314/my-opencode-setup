---
description: Set or view the long-running session goal
agent: build
---
OpenCode goal mode command "/goal" was invoked.

Arguments:
<goal_command_arguments>
$ARGUMENTS
</goal_command_arguments>

Use the goal tools to handle this command:

- Empty, `status`, `show`, or `current`: call `get_goal` and briefly report current state.
- `history`: call `get_goal_history` and briefly report history.
- `clear`, `stop`, `off`, `reset`, `none`, or `cancel`: call `clear_goal`.
- `pause`: call `update_goal_status` with status `paused`.
- `resume`: call `update_goal_status` with status `active`, then continue working.
- `edit <objective>`: call `update_goal_objective` with remaining text.
- `complete <evidence>` or `done <evidence>`: audit real artifacts and command output. Call `update_goal` with status `complete` only when achieved.
- `unmet <blocker>`, `blocked <blocker>`, or `blocker <blocker>`: call `update_goal` with status `unmet` only when external input or state blocks completion.
- Anything else: call `create_goal` with full arguments as objective. Pass explicit budget instructions through supported budget fields instead of leaving them in objective.

Create goal only from explicit command arguments. After creation, continue toward objective.
