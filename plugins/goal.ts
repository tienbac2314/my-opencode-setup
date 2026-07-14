import goalModule from "@prevalentware/opencode-goal-plugin/server"

type GoalModule = {
  server?: (...args: any[]) => Promise<unknown>
}

const server = (goalModule as GoalModule).server

if (typeof server !== "function") {
  throw new Error("@prevalentware/opencode-goal-plugin/server did not export a server plugin")
}

export const GoalPlugin = async (...args: Parameters<NonNullable<GoalModule["server"]>>) => {
  const hooks = await server(...args) as any
  const configure = hooks.config

  return {
    ...hooks,
    async config(config: any) {
      if (config.command?.goal?.template === "$ARGUMENTS") {
        delete config.command.goal
      }
      await configure?.(config)
    },
  }
}
