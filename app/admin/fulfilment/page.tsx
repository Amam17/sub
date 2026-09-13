// app/admin/fulfilment/page.tsx
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/Card";
import { TaskActions } from "@/components/admin/TaskActions";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const PRIORITY_LABEL: Record<number, { label: string; className: string }> = {
  1: { label: "Urgent", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  2: { label: "High", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  3: { label: "Normal", className: "bg-surface-secondary text-text-secondary" },
  4: { label: "Normal", className: "bg-surface-secondary text-text-secondary" },
  5: { label: "Low", className: "bg-surface-secondary text-text-secondary" },
};

export default async function AdminFulfilmentPage() {
  const client = getServiceClient();
  const { data: tasks } = await client
    .from("admin_tasks")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">Fulfilment</h1>
      <p className="mt-1 text-text-secondary">
        Everything automation couldn't finish on its own, ordered by priority.
      </p>

      {!tasks || tasks.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-text-secondary">
          Nothing pending — automation is keeping up.
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {tasks.map((task) => {
            const priority = PRIORITY_LABEL[task.priority] ?? PRIORITY_LABEL[3];
            return (
              <Card key={task.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priority.className}`}>
                      {priority.label}
                    </span>
                    <p className="font-medium text-text-primary">{task.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{task.instructions}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {task.task_type} · {new Date(task.created_at).toLocaleString()}
                  </p>
                </div>
                <TaskActions
                  taskId={task.id}
                  taskType={task.task_type}
                  entityType={task.entity_type}
                  entityId={task.entity_id}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
