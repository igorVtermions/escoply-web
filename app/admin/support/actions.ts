"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupportTicketPriority, SupportTicketStatus, SupportTicketType, UserPlan } from "@/types/admin";

const allowedTypes = new Set<SupportTicketType>(["support", "bug", "question", "billing", "access", "suggestion", "feature_request", "criticism"]);
const allowedStatuses = new Set<SupportTicketStatus>(["new", "open", "in_progress", "waiting_user", "planned", "resolved", "closed", "rejected"]);
const allowedPriorities = new Set<SupportTicketPriority>(["low", "medium", "high", "urgent"]);
const allowedPlans = new Set<UserPlan>(["free", "starter", "pro", "ai"]);

export type CreateSupportTicketInput = {
  userName: string;
  userEmail: string;
  userPlan: UserPlan;
  type: SupportTicketType;
  subject: string;
  message: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
};

async function assertCurrentUserIsAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, status")
    .eq("id", authData.user.id)
    .maybeSingle<{ full_name: string | null; role: string | null; status: string | null }>();

  if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
    throw new Error("Ação permitida apenas para administradores ativos.");
  }

  return {
    id: authData.user.id,
    name: profile.full_name || authData.user.email || "Admin Escoply",
  };
}

function sanitizeText(value: string, fieldLabel: string, minLength: number, maxLength: number) {
  const nextValue = value.trim();

  if (nextValue.length < minLength) {
    throw new Error(`${fieldLabel} precisa ter pelo menos ${minLength} caracteres.`);
  }

  return nextValue.slice(0, maxLength);
}

function sanitizeEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail inválido.");
  }

  return email.slice(0, 254);
}

export async function createSupportTicketAction(input: CreateSupportTicketInput) {
  await assertCurrentUserIsAdmin();

  if (!allowedTypes.has(input.type)) throw new Error("Tipo de chamado inválido.");
  if (!allowedPriorities.has(input.priority)) throw new Error("Prioridade inválida.");
  if (!allowedStatuses.has(input.status)) throw new Error("Status inválido.");
  if (!allowedPlans.has(input.userPlan)) throw new Error("Plano inválido.");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("support_tickets").insert({
    user_name: sanitizeText(input.userName, "Nome do usuário", 2, 160),
    user_email: sanitizeEmail(input.userEmail),
    user_plan: input.userPlan,
    type: input.type,
    subject: sanitizeText(input.subject, "Assunto", 3, 180),
    message: sanitizeText(input.message, "Mensagem", 3, 5000),
    priority: input.priority,
    status: input.status,
  });

  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath("/admin/support");
}

export async function updateSupportTicketStatusAction(ticketId: string, status: SupportTicketStatus) {
  await assertCurrentUserIsAdmin();

  if (!allowedStatuses.has(status)) {
    throw new Error("Status inválido.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticketId);

  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath("/admin/support");
}

export async function replyToSupportTicketAction(ticketId: string, message: string) {
  const admin = await assertCurrentUserIsAdmin();
  const cleanMessage = sanitizeText(message, "Resposta", 2, 5000);
  const supabase = createSupabaseAdminClient();

  const { error: replyError } = await supabase.from("support_ticket_replies").insert({
    ticket_id: ticketId,
    author_id: admin.id,
    author_name: admin.name,
    author_role: "admin",
    message: cleanMessage,
  });

  if (replyError) throw replyError;

  const { error: ticketError } = await supabase
    .from("support_tickets")
    .update({
      last_reply_at: new Date().toISOString(),
      status: "in_progress",
    })
    .eq("id", ticketId);

  if (ticketError) throw ticketError;

  revalidatePath("/admin");
  revalidatePath("/admin/support");
}
