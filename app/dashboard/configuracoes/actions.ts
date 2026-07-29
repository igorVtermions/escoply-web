"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UpdateProfileResult = {
  success: boolean;
  message: string;
};

type ExportTableName =
  | "profiles"
  | "clients"
  | "projects"
  | "reminders"
  | "budgets"
  | "payments"
  | "obligations"
  | "project_scope_items"
  | "project_approvals"
  | "project_materials"
  | "notification_preferences"
  | "notification_states";

type ExportRows = Record<string, unknown>[];

export type AccountDataExport = {
  exportedAt: string;
  ownerId: string;
  tables: Record<ExportTableName, ExportRows>;
};

export type ExportAccountDataResult = UpdateProfileResult & {
  data?: AccountDataExport;
};

function getValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function updatePasswordAction(formData: FormData): Promise<UpdateProfileResult> {
  const user = await requireUser();
  const currentPassword = getValue(formData, "currentPassword");
  const newPassword = getValue(formData, "newPassword");
  const confirmPassword = getValue(formData, "confirmPassword");

  if (!user.email) {
    return { success: false, message: "Não foi possível identificar o e-mail da sua conta." };
  }

  if (!currentPassword) {
    return { success: false, message: "Informe sua senha atual." };
  }

  if (!isStrongPassword(newPassword)) {
    return {
      success: false,
      message: "A nova senha precisa ter 8 caracteres, letra maiúscula, letra minúscula, número e caractere especial.",
    };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: "As senhas informadas não são iguais." };
  }

  if (currentPassword === newPassword) {
    return { success: false, message: "A nova senha precisa ser diferente da senha atual." };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, message: "Senha atual incorreta." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, message: "Não foi possível alterar a senha agora." };
  }

  return { success: true, message: "Senha alterada com sucesso." };
}

function normalizeOptional(value: string) {
  return value.length > 0 ? value : null;
}

function isValidUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function revalidateProfileViews() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/configuracoes");
}

async function exportOwnerTable(tableName: Exclude<ExportTableName, "profiles">, ownerId: string): Promise<ExportRows> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(tableName).select("*").eq("owner_id", ownerId).order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ExportRows;
}

async function deleteTestRows(tableName: string, ownerId: string, textColumns: string[]) {
  const supabase = await createSupabaseServerClient();
  const patterns = textColumns.flatMap((column) => [
    `${column}.ilike.%teste%`,
    `${column}.ilike.%test%`,
    `${column}.ilike.%demo%`,
    `${column}.ilike.%mock%`,
    `${column}.ilike.%exemplo%`,
  ]);

  if (patterns.length === 0) return 0;

  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .eq("owner_id", ownerId)
    .or(patterns.join(","))
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export async function updateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  const user = await requireUser();

  const name = getValue(formData, "name");
  const phone = getValue(formData, "phone");
  const profession = getValue(formData, "profession");
  const bio = getValue(formData, "bio");

  if (name.length < 2 || name.length > 120) {
    return { success: false, message: "Informe um nome entre 2 e 120 caracteres." };
  }

  if (phone.length > 40) {
    return { success: false, message: "O telefone pode ter no máximo 40 caracteres." };
  }

  if (profession.length > 120) {
    return { success: false, message: "O cargo/profissão pode ter no máximo 120 caracteres." };
  }

  if (bio.length > 280) {
    return { success: false, message: "A bio pode ter no máximo 280 caracteres." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: name,
      phone: normalizeOptional(phone),
      profession: normalizeOptional(profession),
      bio: normalizeOptional(bio),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, message: "Não foi possível salvar o perfil agora." };
  }

  revalidateProfileViews();
  return { success: true, message: "Perfil atualizado com sucesso." };
}

export async function updateProfileAvatarAction(avatarPath: string): Promise<UpdateProfileResult> {
  const user = await requireUser();
  const path = avatarPath.trim();

  if (!path.startsWith(`${user.id}/`) || path.length > 500) {
    return { success: false, message: "Imagem de perfil inválida." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);

  if (error) {
    return { success: false, message: "Não foi possível salvar a imagem de perfil." };
  }

  revalidateProfileViews();
  return { success: true, message: "Foto de perfil atualizada." };
}

export async function exportAccountDataAction(): Promise<ExportAccountDataResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (profileError) {
    return { success: false, message: "Não foi possível exportar o perfil agora." };
  }

  try {
    const [
      clients,
      projects,
      reminders,
      budgets,
      payments,
      obligations,
      projectScopeItems,
      projectApprovals,
      projectMaterials,
      notificationPreferences,
      notificationStates,
    ] = await Promise.all([
      exportOwnerTable("clients", user.id),
      exportOwnerTable("projects", user.id),
      exportOwnerTable("reminders", user.id),
      exportOwnerTable("budgets", user.id),
      exportOwnerTable("payments", user.id),
      exportOwnerTable("obligations", user.id),
      exportOwnerTable("project_scope_items", user.id),
      exportOwnerTable("project_approvals", user.id),
      exportOwnerTable("project_materials", user.id),
      exportOwnerTable("notification_preferences", user.id),
      exportOwnerTable("notification_states", user.id),
    ]);

    return {
      success: true,
      message: "Exportação gerada com sucesso.",
      data: {
        exportedAt: new Date().toISOString(),
        ownerId: user.id,
        tables: {
          profiles: profile ? [profile as Record<string, unknown>] : [],
          clients,
          projects,
          reminders,
          budgets,
          payments,
          obligations,
          project_scope_items: projectScopeItems,
          project_approvals: projectApprovals,
          project_materials: projectMaterials,
          notification_preferences: notificationPreferences,
          notification_states: notificationStates,
        },
      },
    };
  } catch {
    return { success: false, message: "Não foi possível gerar a exportação dos dados agora." };
  }
}

export async function clearTestDataAction(): Promise<UpdateProfileResult & { deletedCount?: number }> {
  const user = await requireUser();

  try {
    let deletedCount = 0;

    deletedCount += await deleteTestRows("project_materials", user.id, ["title", "note", "url", "file_path"]);
    deletedCount += await deleteTestRows("project_approvals", user.id, ["title", "note"]);
    deletedCount += await deleteTestRows("project_scope_items", user.id, ["title"]);
    deletedCount += await deleteTestRows("reminders", user.id, ["title"]);
    deletedCount += await deleteTestRows("payments", user.id, ["description", "receipt_file_name"]);
    deletedCount += await deleteTestRows("obligations", user.id, ["title", "description"]);
    deletedCount += await deleteTestRows("projects", user.id, ["name", "description"]);
    deletedCount += await deleteTestRows("clients", user.id, ["name", "company_name", "email"]);

    revalidateProfileViews();
    revalidatePath("/dashboard", "layout");

    return {
      success: true,
      message: deletedCount > 0 ? `${deletedCount} registro(s) de teste foram removidos.` : "Nenhum dado de teste foi encontrado.",
      deletedCount,
    };
  } catch {
    return { success: false, message: "Não foi possível limpar os dados de teste agora." };
  }
}

export async function updateProfessionalProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  const user = await requireUser();

  const brandName = getValue(formData, "brand_name");
  const professionalType = getValue(formData, "professional_type");
  const document = getValue(formData, "document");
  const city = getValue(formData, "city");
  const state = getValue(formData, "state");
  const website = getValue(formData, "website");
  const instagram = getValue(formData, "instagram");
  const linkedin = getValue(formData, "linkedin");
  const businessWhatsapp = getValue(formData, "business_whatsapp");

  if (brandName.length > 160) {
    return { success: false, message: "O nome profissional ou marca pode ter no máximo 160 caracteres." };
  }

  if (professionalType.length > 80) {
    return { success: false, message: "O tipo de profissional pode ter no máximo 80 caracteres." };
  }

  if (document.length > 40) {
    return { success: false, message: "O documento pode ter no máximo 40 caracteres." };
  }

  if (city.length > 120) {
    return { success: false, message: "A cidade pode ter no máximo 120 caracteres." };
  }

  if (state.length > 60) {
    return { success: false, message: "O estado pode ter no máximo 60 caracteres." };
  }

  if (website.length > 240 || !isValidUrl(website)) {
    return { success: false, message: "Informe um site válido começando com http:// ou https://." };
  }

  if (instagram.length > 120) {
    return { success: false, message: "O Instagram pode ter no máximo 120 caracteres." };
  }

  if (linkedin.length > 240) {
    return { success: false, message: "O LinkedIn pode ter no máximo 240 caracteres." };
  }

  if (businessWhatsapp.length > 40) {
    return { success: false, message: "O WhatsApp comercial pode ter no máximo 40 caracteres." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      company_name: normalizeOptional(brandName),
      professional_type: normalizeOptional(professionalType),
      document: normalizeOptional(document),
      city: normalizeOptional(city),
      state: normalizeOptional(state),
      website: normalizeOptional(website),
      instagram: normalizeOptional(instagram),
      linkedin: normalizeOptional(linkedin),
      business_whatsapp: normalizeOptional(businessWhatsapp),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, message: "Não foi possível salvar o perfil profissional agora." };
  }

  revalidateProfileViews();
  return { success: true, message: "Perfil profissional atualizado com sucesso." };
}

export async function updateNotificationPreferencesAction(formData: FormData): Promise<UpdateProfileResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const preferences = {
    owner_id: user.id,
    daily_reminders: formData.get("dailyReminders") === "on",
    upcoming_deadlines: formData.get("upcomingDeadlines") === "on",
    overdue_payments: formData.get("overduePayments") === "on",
    pending_budgets: formData.get("pendingBudgets") === "on",
    recurring_obligations: formData.get("recurringObligations") === "on",
    weekly_summary: formData.get("weeklySummary") === "on",
  };

  const { error } = await supabase.from("notification_preferences").upsert(preferences, { onConflict: "owner_id" });

  if (error) {
    return { success: false, message: "Não foi possível salvar as notificações agora." };
  }

  revalidateProfileViews();
  revalidatePath("/dashboard", "layout");
  return { success: true, message: "Preferências de notificação atualizadas." };
}
