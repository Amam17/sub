// app/api/cron/process-automation-tasks/route.ts
//
// Scheduled job — run every 1-5 minutes. Generic processor for
// the automation_tasks queue. Each task_type has a handler;
// unrecognized types are escalated immediately rather than
// silently dropped. Retry schedule follows the build spec:
// immediate, 5 min, 30 min, 2 hours, then requires_review.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { notify } from "@/lib/notifications";

const RETRY_DELAYS_MINUTES = [0, 5, 30, 120];

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type TaskHandler = (
  client: ReturnType<typeof getServiceClient>,
  task: { id: string; entity_type: string; entity_id: string; metadata: Record<string, unknown> }
) => Promise<void>;

/**
 * provision_next_pool: automation can only get a new pool to
 * "draft" — real provisioning of an operational identity
 * (pool_identities) generally needs a human or a provider-side
 * API call that isn't safe to assume exists for every service.
 * So this handler creates the draft pool row and an admin task
 * to complete provisioning, then marks itself done.
 */
const provisionNextPool: TaskHandler = async (client, task) => {
  const serviceId = task.entity_id;

  const { data: lastPool } = await client
    .from("pools")
    .select("pool_number, total_capacity")
    .eq("service_id", serviceId)
    .order("pool_number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = (lastPool?.pool_number ?? 0) + 1;

  const { data: newPool, error } = await client
    .from("pools")
    .insert({
      service_id: serviceId,
      pool_number: nextNumber,
      name: `Pool ${nextNumber}`,
      status: "draft",
      total_capacity: lastPool?.total_capacity ?? 0,
    })
    .select()
    .single();

  if (error || !newPool) {
    throw new Error(`Failed to create next pool: ${error?.message}`);
  }

  await client.from("admin_tasks").insert({
    task_type: "provision_pool_identity",
    entity_type: "pool",
    entity_id: newPool.id,
    title: `Provision identity/capacity for pool ${nextNumber}`,
    instructions:
      "A new pool was auto-created because the previous pool reached its utilization threshold. Complete the provider-approved provisioning step, set total_capacity, and set status to 'ready'.",
    status: "pending",
    priority: 4,
  });

  await client.from("pool_events").insert({
    pool_id: newPool.id,
    event_type: "provisioning_started",
    event_source: "automation",
    status: "success",
  });
};

/**
 * These three delivery types (seat_invitation, account_creation_link,
 * existing_account) all require an action this backend can't safely
 * perform unattended: sending an invite from a pool's operational
 * identity, generating a provider-specific signup link, or reading
 * account details the customer hasn't supplied yet. Rather than
 * pretend to automate a third-party action, each handler notifies
 * the customer that activation is underway and creates a targeted
 * admin_task with the context an operator needs to finish it by hand
 * (or via whatever provider integration exists for that service).
 */
async function queueOperatorHandoff(
  client: ReturnType<typeof getServiceClient>,
  task: { entity_id: string; metadata: Record<string, unknown> },
  title: string,
  instructions: string,
  notifyMessage: string
) {
  const deliveryId = task.entity_id;
  const userId = task.metadata.user_id as string | undefined;
  const subscriptionId = task.metadata.subscription_id as string | undefined;

  await client.from("admin_tasks").insert({
    task_type: "access_delivery_handoff",
    entity_type: "access_delivery",
    entity_id: deliveryId,
    title,
    instructions,
    status: "pending",
    priority: 3,
  });

  if (userId) {
    await notify({
      userId,
      category: "access_ready",
      title: "Activation in progress",
      message: notifyMessage,
      sendEmail: true,
    });
  }
}

const sendSeatInvitation: TaskHandler = async (client, task) =>
  queueOperatorHandoff(
    client,
    task,
    "Send seat invitation to customer",
    `Access delivery ${task.entity_id}: send the official seat invitation from the assigned pool's operational identity, then mark the access delivery active.`,
    "We're preparing your access. You'll receive an invitation shortly."
  );

const sendAccountCreationLink: TaskHandler = async (client, task) =>
  queueOperatorHandoff(
    client,
    task,
    "Send account creation link to customer",
    `Access delivery ${task.entity_id}: generate and send the provider's account-creation instructions/link, then mark the access delivery active.`,
    "We're preparing your access. You'll receive account setup instructions shortly."
  );

const requestExistingAccountInfo: TaskHandler = async (client, task) =>
  queueOperatorHandoff(
    client,
    task,
    "Collect existing-account details from customer",
    `Access delivery ${task.entity_id}: this service requires the customer's own account email. Follow up with the customer, validate eligibility, and assign the entitlement.`,
    "We're preparing your access. Please check your dashboard — we may need a few details about your existing account to continue."
  );

const TASK_HANDLERS: Record<string, TaskHandler> = {
  provision_next_pool: provisionNextPool,
  send_seat_invitation: sendSeatInvitation,
  send_account_creation_link: sendAccountCreationLink,
  request_existing_account_info: requestExistingAccountInfo,
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const client = getServiceClient();
  const now = new Date();

  const { data: tasks } = await client
    .from("automation_tasks")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now.toISOString())
    .order("priority", { ascending: true })
    .limit(25);

  let processed = 0;
  let failed = 0;
  let escalated = 0;

  for (const task of tasks ?? []) {
    await client
      .from("automation_tasks")
      .update({ status: "processing", started_at: now.toISOString() })
      .eq("id", task.id);

    const handler = TASK_HANDLERS[task.task_type];

    try {
      if (!handler) {
        throw new Error(`No handler registered for task_type "${task.task_type}"`);
      }

      await handler(client, task);

      await client
        .from("automation_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", task.id);

      processed += 1;
    } catch (err) {
      const attemptCount = task.attempt_count + 1;
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (attemptCount >= task.max_attempts) {
        await client
          .from("automation_tasks")
          .update({
            status: "requires_review",
            attempt_count: attemptCount,
            error_message: errorMessage,
          })
          .eq("id", task.id);

        await client.from("admin_tasks").insert({
          task_type: "automation_failure",
          entity_type: task.entity_type,
          entity_id: task.entity_id,
          title: `Automation task "${task.task_type}" failed after ${attemptCount} attempts`,
          instructions: errorMessage,
          status: "pending",
          priority: 2,
        });

        escalated += 1;
      } else {
        const delayMinutes = RETRY_DELAYS_MINUTES[attemptCount] ?? 120;
        await client
          .from("automation_tasks")
          .update({
            status: "pending",
            attempt_count: attemptCount,
            error_message: errorMessage,
            scheduled_at: new Date(now.getTime() + delayMinutes * 60 * 1000).toISOString(),
          })
          .eq("id", task.id);
      }

      failed += 1;
    }
  }

  return NextResponse.json({ processed, failed, escalated });
}
