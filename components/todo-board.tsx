"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type TaskStatus = "todo" | "doing" | "done"

type Task = {
  id: string
  title: string
  detail: string
  status: TaskStatus
}

const columns: Array<{ key: TaskStatus; label: string }> = [
  { key: "todo", label: "待办事项" },
  { key: "doing", label: "进行中" },
  { key: "done", label: "已完成" },
]

const nextActionLabel: Record<Exclude<TaskStatus, "done">, string> = {
  todo: "开始开发",
  doing: "标记完成",
}

export function TodoBoard() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [newTitle, setNewTitle] = React.useState("")
  const [newDetail, setNewDetail] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await fetch("/api/tasks", { cache: "no-store" })

        if (!response.ok) {
          return
        }

        const data: unknown = await response.json()
        if (!data || typeof data !== "object") {
          return
        }

        const payload = data as { tasks?: unknown }
        if (Array.isArray(payload.tasks)) {
          setTasks(payload.tasks as Task[])
        }
      } finally {
        setLoading(false)
      }
    }

    void loadTasks()
  }, [])

  const isDark = resolvedTheme === "dark"

  const persistTasks = async (nextTasks: Task[]) => {
    setTasks(nextTasks)
    setSaving(true)

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tasks: nextTasks }),
      })
    } finally {
      setSaving(false)
    }
  }

  const addTask = () => {
    const title = newTitle.trim()
    const detail = newDetail.trim()

    if (!title) {
      return
    }

    const nextTasks: Task[] = [
      {
        id: crypto.randomUUID(),
        title,
        detail,
        status: "todo",
      },
      ...tasks,
    ]

    void persistTasks(nextTasks)
    setNewTitle("")
    setNewDetail("")
  }

  const updateTask = (id: string, patch: Partial<Pick<Task, "title" | "detail">>) => {
    const nextTasks = tasks.map((task) => (task.id === id ? { ...task, ...patch } : task))
    void persistTasks(nextTasks)

    if (activeTask?.id === id) {
      setActiveTask((prev) => (prev ? { ...prev, ...patch } : prev))
    }
  }

  const moveForward = (id: string) => {
    const nextTasks: Task[] = tasks.map((task) => {
      if (task.id !== id) {
        return task
      }

      if (task.status === "todo") {
        return { ...task, status: "doing" }
      }

      if (task.status === "doing") {
        return { ...task, status: "done" }
      }

      return task
    })

    void persistTasks(nextTasks)
  }

  const moveBack = (id: string) => {
    const nextTasks: Task[] = tasks.map((task) => {
      if (task.id !== id) {
        return task
      }

      if (task.status === "done") {
        return { ...task, status: "doing" }
      }

      if (task.status === "doing") {
        return { ...task, status: "todo" }
      }

      return task
    })

    void persistTasks(nextTasks)
  }

  const removeTask = (id: string) => {
    const nextTasks = tasks.filter((task) => task.id !== id)
    void persistTasks(nextTasks)

    if (activeTask?.id === id) {
      setDialogOpen(false)
      setActiveTask(null)
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="ring-foreground/10 bg-card flex flex-col gap-4 rounded-none border p-4 ring-1 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">开发追踪板</h1>
            <p className="text-muted-foreground text-xs">
              管理项目的事项进度，支持标题与详细内容编辑
            </p>
            <p className="text-muted-foreground text-xs">
              {loading ? "加载中..." : saving ? "正在保存..." : "已保存到 JSON"}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            {mounted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? "切换白天" : "切换黑暗"}
              </Button>
            )}
          </div>
        </header>

        <Card className="py-0">
          <CardHeader className="border-b">
            <CardTitle>新增事项</CardTitle>
            <CardDescription>输入标题与详情后加入待办列</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">标题</p>
              <Input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="准备做什么新功能？"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    addTask()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">详细内容</p>
              <Textarea
                value={newDetail}
                onChange={(event) => setNewDetail(event.target.value)}
                placeholder="补充说明、验收标准或备注"
                className="min-h-8"
              />
            </div>
            <Button onClick={addTask}>添加</Button>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-3">
          {columns.map((column) => {
            const items = tasks.filter((task) => task.status === column.key)

            return (
              <Card key={column.key} className="bg-background/70 py-0">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{column.label}</CardTitle>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 py-4">
                  {items.map((task) => (
                    <Card key={task.id} className="bg-card py-0">
                      <CardContent className="space-y-3 py-4">
                        <Input
                          value={task.title}
                          onChange={(event) =>
                            updateTask(task.id, { title: event.target.value })
                          }
                          placeholder="任务标题"
                        />
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground w-full rounded-none border px-2.5 py-2 text-left text-xs transition-colors"
                          onClick={() => {
                            setActiveTask(task)
                            setDialogOpen(true)
                          }}
                        >
                          <p className="mb-1 font-medium">详细内容（点击查看/编辑）</p>
                          <p
                            className="whitespace-pre-wrap"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {task.detail || "暂无详细内容"}
                          </p>
                        </button>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {task.status !== "todo" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => moveBack(task.id)}
                              >
                                退回
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeTask(task.id)}
                            >
                              删除
                            </Button>
                          </div>
                          {task.status !== "done" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => moveForward(task.id)}
                            >
                              {nextActionLabel[task.status]}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <p className="text-muted-foreground rounded-none border border-dashed p-3 text-xs">
                      当前列暂无事项
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </section>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setActiveTask(null)
          }
        }}
      >
        <DialogTrigger className="hidden" />
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>事项详情</DialogTitle>
            <DialogDescription>适合查看和编辑较长的详细内容</DialogDescription>
          </DialogHeader>
          {activeTask && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">标题</p>
                <Input
                  value={activeTask.title}
                  onChange={(event) =>
                    updateTask(activeTask.id, { title: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">详细内容</p>
                <Textarea
                  value={activeTask.detail}
                  onChange={(event) =>
                    updateTask(activeTask.id, { detail: event.target.value })
                  }
                  className="min-h-52"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
