// app/api/support/tickets/[id]/route.ts
//
// GET   /api/support/tickets/:id           — thread (owner or staff)
// POST  /api/support/tickets/:id           — reply { message }
// PATCH /api/support/tickets/:id           — staff only: { status }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getContext(ticketId: string) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "UNAUTHENTICATED" as const, status: 401 };

  const client = getServiceClient();
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = ["support", "operator", "admin", "super_admin"].includes(profile?.role ?? "");

  const { data: ticket } = await client
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "TICKET_NOT_FOUND" as const, status: 404 };
  if (!isStaff && ticket.user_id !== user.id) return { error: "FORBIDDEN" as const, status: 403 };

  return { client, user, isStaff, ticket };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getContext(params.id);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { data: messages } = await ctx.client
    .from("support_messages")
    .select("*")
    .eq("ticket_id", params.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ ticket: ctx.ticket, messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getContext(params.id);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await request.json().catch(() => null);
  if (!body?.message) {
    return NextResponse.json({ error: "MISSING_MESSAGE" }, { status: 400 });
  }

  const senderRole = ctx.isStaff ? "support" : "customer";

  await ctx.client.from("support_messages").insert({
    ticket_id: params.id,
    sender_id: ctx.user.id,
    sender_role: senderRole,
    message: body.message,
  });

  const newStatus = ctx.isStaff ? "waiting_for_customer" : "in_progress";
  await ctx.client
    .from("support_tickets")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (ctx.isStaff) {
    await notify({
      userId: ctx.ticket.user_id,
      category: "support_reply",
      title: "Support replied to your ticket",
      message: "You have a new reply on your support ticket. Open it to view the response.",
      sendEmail: true,
    });
  }

  return NextResponse.json({ status: "reply_added" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getContext(params.id);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  if (!ctx.isStaff) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const validStatuses = ["open", "in_progress", "waiting_for_customer", "resolved", "closed"];
  if (!validStatuses.includes(body?.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  await ctx.client
    .from("support_tickets")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ status: "updated" });
}
