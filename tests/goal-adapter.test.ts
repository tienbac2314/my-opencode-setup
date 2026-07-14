import { expect, mock, test } from "bun:test"

const upstreamServer = mock(async () => ({
  async config(config: any) {
    config.command ??= {}
    if (!config.command.goal) {
      config.command.goal = {
        description: "Set or view the long-running session goal",
        template: "Use create_goal for a new objective and get_goal for status.",
      }
    }
  },
  tool: {
    create_goal: {},
    get_goal: {},
  },
}))

mock.module("@prevalentware/opencode-goal-plugin/server", () => ({
  default: {
    id: "local.goal-mode.server",
    server: upstreamServer,
  },
}))

const { GoalPlugin } = await import("../plugins/goal")

test("goal adapter exposes server function and replaces legacy command", async () => {
  const hooks = await GoalPlugin({} as any) as any
  const config = {
    command: {
      goal: {
        template: "$ARGUMENTS",
      },
    },
  }

  await hooks.config(config)

  expect(upstreamServer).toHaveBeenCalledTimes(1)
  expect(config.command.goal.template).toContain("create_goal")
  expect(config.command.goal.template).toContain("get_goal")
  expect(hooks.tool).toHaveProperty("create_goal")
  expect(hooks.tool).toHaveProperty("get_goal")
})

test("goal adapter preserves an intentional custom command", async () => {
  const hooks = await GoalPlugin({} as any) as any
  const config = {
    command: {
      goal: {
        template: "custom goal command",
      },
    },
  }

  await hooks.config(config)

  expect(config.command.goal.template).toBe("custom goal command")
})
