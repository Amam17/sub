// app/api/support/tickets/route.ts
//
// GET  /api/support/tickets       — customer: own tickets; staff: all
// POST /api/support/tickets       — create a ticket (customer)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTicketSchema, validateBody } from "@/lib/validation/schemas";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const client = getServiceClient();
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = ["support", "operator", "admin", "super_admin"].includes(profile?.role ?? "");

  let query = client
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isStaff) query = query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  return NextResponse.json({ tickets: data });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = validateBody(createTicketSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", detail: parsed.error }, { status: 400 });
  }
  const { subject, category, message } = parsed.data;

  const client = getServiceClient();

  const { data: ticket, error: ticketError } = await client
    .from("support_tickets")
    .insert({ user_id: user.id, category, subject, status: "open" })
    .select()
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "TICKET_CREATE_FAILED" }, { status: 500 });
  }

  await client.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    sender_role: "customer",
    message,
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
