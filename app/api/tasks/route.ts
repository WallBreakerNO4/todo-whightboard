import { promises as fs } from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"

type TaskStatus = "todo" | "doing" | "done"

type Task = {
  id: string
  title: string
  detail: string
  status: TaskStatus
}

const TASKS_FILE = path.join(process.cwd(), "data", "tasks.json")

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "doing" || value === "done"
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") {
    return false
  }

  const task = value as Record<string, unknown>

  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.detail === "string" &&
    isTaskStatus(task.status)
  )
}

async function readTasksFile(): Promise<Task[]> {
  const content = await fs.readFile(TASKS_FILE, "utf8")
  const parsed: unknown = JSON.parse(content)

  if (!Array.isArray(parsed) || parsed.some((item) => !isTask(item))) {
    throw new Error("Invalid tasks data")
  }

  return parsed
}

async function writeTasksFile(tasks: Task[]) {
  await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true })
  await fs.writeFile(TASKS_FILE, `${JSON.stringify(tasks, null, 2)}\n`, "utf8")
}

export async function GET() {
  try {
    const tasks = await readTasksFile()
    return NextResponse.json({ tasks })
  } catch {
    return NextResponse.json({ tasks: [] })
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json()

    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 })
    }

    const payload = body as { tasks?: unknown }

    if (!Array.isArray(payload.tasks) || payload.tasks.some((item) => !isTask(item))) {
      return NextResponse.json({ message: "Invalid tasks" }, { status: 400 })
    }

    await writeTasksFile(payload.tasks)

    return NextResponse.json({ tasks: payload.tasks })
  } catch {
    return NextResponse.json({ message: "Failed to save tasks" }, { status: 500 })
  }
}
