import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  SupportTicket,
  SupportTicketPriority,
  SupportTicketReply,
  SupportTicketStatus,
  SupportTicketType,
  UserPlan,
  UserRole,
} from "@/types/admin";

type SupportTicketRow = {
  id: string;
  code: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_plan: string | null;
  type: string | null;
  subject: string | null;
  message: string | null;
  priority: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  last_reply_at: string | null;
};

type SupportTicketReplyRow = {
  id: string;
  ticket_id: string;
  author_name: string | null;
  author_role: string | null;
  message: string | null;
  created_at: string;
};

export type AdminSupportSummary = {
  newTickets: number;
  openTickets: number;
  urgentTickets: number;
  inProgressTickets: number;
  plannedTickets: number;
  resolvedTickets: number;
};

export type AdminSupportData = {
  tickets: SupportTicket[];
  summary: AdminSupportSummary;
};

const fallbackDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function isSupportTicketType(value: string | null | undefined): value is SupportTicketType {
  return ["support", "bug", "question", "billing", "access", "suggestion", "feature_request", "criticism"].includes(value ?? "");
}

function isSupportTicketStatus(value: string | null | undefined): value is SupportTicketStatus {
  return ["new", "open", "in_progress", "waiting_user", "planned", "resolved", "closed", "rejected"].includes(value ?? "");
}

function isSupportTicketPriority(value: string | null | undefined): value is SupportTicketPriority {
  return ["low", "medium", "high", "urgent"].includes(value ?? "");
}

function isUserPlan(value: string | null | undefined): value is UserPlan {
  return value === "free" || value === "starter" || value === "pro" || value === "ai";
}

function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "user" || value === "admin";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return fallbackDateFormatter.format(new Date(value));
}

function mapReply(row: SupportTicketReplyRow): SupportTicketReply {
  return {
    id: row.id,
    authorName: row.author_name || "Usuário Escoply",
    authorRole: isUserRole(row.author_role) ? row.author_role : "user",
    message: row.message || "Resposta sem conteúdo.",
    createdAt: formatDateTime(row.created_at),
    createdAtIso: row.created_at,
  };
}

function mapTicket(row: SupportTicketRow, replies: SupportTicketReply[]): SupportTicket {
  return {
    id: row.id,
    code: row.code || "SUP",
    userId: row.user_id ?? undefined,
    type: isSupportTicketType(row.type) ? row.type : "support",
    subject: row.subject || "Chamado sem assunto",
    message: row.message || "Chamado sem mensagem.",
    userName: row.user_name || "Usuário Escoply",
    userEmail: row.user_email || "—",
    userPlan: isUserPlan(row.user_plan) ? row.user_plan : "free",
    priority: isSupportTicketPriority(row.priority) ? row.priority : "medium",
    status: isSupportTicketStatus(row.status) ? row.status : "new",
    createdAt: formatDateTime(row.created_at),
    createdAtIso: row.created_at,
    updatedAt: formatDateTime(row.updated_at),
    updatedAtIso: row.updated_at,
    lastReplyAt: row.last_reply_at ? formatDateTime(row.last_reply_at) : undefined,
    lastReplyAtIso: row.last_reply_at ?? undefined,
    replies,
  };
}

function getSummary(tickets: SupportTicket[]): AdminSupportSummary {
  return {
    newTickets: tickets.filter((ticket) => ticket.status === "new").length,
    openTickets: tickets.filter((ticket) => ticket.status === "open").length,
    urgentTickets: tickets.filter((ticket) => ticket.priority === "urgent").length,
    inProgressTickets: tickets.filter((ticket) => ticket.status === "in_progress").length,
    plannedTickets: tickets.filter((ticket) => ticket.status === "planned").length,
    resolvedTickets: tickets.filter((ticket) => ticket.status === "resolved" || ticket.status === "closed").length,
  };
}

export async function getAdminSupportData(): Promise<AdminSupportData> {
  const supabase = createSupabaseAdminClient();

  const { data: ticketRows, error: ticketsError } = await supabase
    .from("support_tickets")
    .select("id, code, user_id, user_name, user_email, user_plan, type, subject, message, priority, status, created_at, updated_at, last_reply_at")
    .order("created_at", { ascending: false });

  if (ticketsError) throw ticketsError;

  const ticketIds = (ticketRows ?? []).map((ticket) => ticket.id);
  const repliesByTicketId = new Map<string, SupportTicketReply[]>();

  if (ticketIds.length > 0) {
    const { data: replyRows, error: repliesError } = await supabase
      .from("support_ticket_replies")
      .select("id, ticket_id, author_name, author_role, message, created_at")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: true });

    if (repliesError) throw repliesError;

    (replyRows ?? []).forEach((reply) => {
      const mappedReply = mapReply(reply as SupportTicketReplyRow);
      const currentReplies = repliesByTicketId.get(reply.ticket_id) ?? [];
      repliesByTicketId.set(reply.ticket_id, [...currentReplies, mappedReply]);
    });
  }

  const tickets = (ticketRows ?? []).map((ticket) => mapTicket(ticket as SupportTicketRow, repliesByTicketId.get(ticket.id) ?? []));

  return {
    tickets,
    summary: getSummary(tickets),
  };
}

export async function getPendingSupportTicketsCount() {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["new", "open", "in_progress", "waiting_user"]);

  if (error) return 0;
  return count ?? 0;
}
