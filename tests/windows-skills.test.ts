import { expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const skill = join(import.meta.dir, "..", "skills", "subagent-driven-development")

test("task brief has a native PowerShell launcher", () => {
  const script = join(skill, "scripts", "task-brief.ps1")
  expect(existsSync(script)).toBe(true)
  expect(readFileSync(join(skill, "SKILL.md"), "utf8")).toContain("pwsh -File scripts/task-brief.ps1")
})

test("PowerShell task brief works outside its repository", () => {
  const directory = mkdtempSync(join(tmpdir(), "task-brief-windows-"))
  try {
    const plan = join(directory, "plan.md")
    const output = join(directory, "brief.md")
    writeFileSync(plan, "# Plan\n\n## Task 1: Native Windows\n\nRun without WSL.\n\n## Task 2: Later\n")

    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", join(skill, "scripts", "task-brief.ps1"), plan, "1", output,
    ], { cwd: directory })

    expect(result.exitCode).toBe(0)
    expect(readFileSync(output, "utf8")).toContain("Run without WSL.")
    expect(readFileSync(output, "utf8")).not.toContain("Task 2")
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
