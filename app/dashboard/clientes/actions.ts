"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClientStatus } from "@/lib/clients/data";

export type CreateClientState = {
  success: boolean;
  message: string;
  clientId?: string;
};

function getValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getLogoFile(formData: FormData) {
  const value = formData.get("logo");
  return value instanceof File && value.size > 0 ? value : null;
}

function validateLogo(file: File | null) {
  if (!file) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "A logo precisa ser PNG, JPG ou WebP.";
  if (file.size > 3 * 1024 * 1024) return "A logo pode ter no máximo 3 MB.";
  return null;
}

function getLogoExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function createClientAction(_state: CreateClientState, formData: FormData): Promise<CreateClientState> {
  const user = await requireUser();
  const name = getValue(formData, "name");
  const companyName = getValue(formData, "company_name");
  const email = getValue(formData, "email").toLowerCase();
  const phone = getValue(formData, "phone");
  const whatsapp = getValue(formData, "whatsapp");
  const website = getValue(formData, "website");
  const notes = getValue(formData, "notes");
  const rawStatus = getValue(formData, "status");
  const logo = getLogoFile(formData);
  const status: ClientStatus = ["active", "prospect", "inactive"].includes(rawStatus) ? rawStatus as ClientStatus : "active";

  if (name.length < 2) return { success: false, message: "Informe um nome com pelo menos 2 caracteres." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: "Informe um e-mail válido." };
  if (website && !/^https?:\/\//i.test(website)) return { success: false, message: "O site precisa começar com http:// ou https://." };
  const logoError = validateLogo(logo);
  if (logoError) return { success: false, message: logoError };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      owner_id: user.id,
      name,
      company_name: companyName || null,
      email: email || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      website: website || null,
      notes: notes || null,
      status,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return { success: false, message: "Não foi possível cadastrar o cliente agora." };

  if (logo) {
    const logoPath = `${user.id}/${data.id}/logo-${Date.now()}.${getLogoExtension(logo)}`;
    const { error: uploadError } = await supabase.storage.from("client-logos").upload(logoPath, logo, { contentType: logo.type, upsert: false });
    if (uploadError) {
      await supabase.from("clients").delete().eq("owner_id", user.id).eq("id", data.id);
      return { success: false, message: "Não foi possível enviar a logo do cliente." };
    }
    const { error: logoUpdateError } = await supabase.from("clients").update({ logo_path: logoPath }).eq("owner_id", user.id).eq("id", data.id);
    if (logoUpdateError) {
      await supabase.storage.from("client-logos").remove([logoPath]);
      await supabase.from("clients").delete().eq("owner_id", user.id).eq("id", data.id);
      return { success: false, message: "Não foi possível vincular a logo ao cliente." };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clientes");
  return { success: true, message: "Cliente cadastrado com sucesso.", clientId: data.id };
}

export async function updateClientAction(formData: FormData): Promise<CreateClientState> {
  const user = await requireUser();
  const clientId = getValue(formData, "client_id");
  const name = getValue(formData, "name");
  const companyName = getValue(formData, "company_name");
  const email = getValue(formData, "email").toLowerCase();
  const phone = getValue(formData, "phone");
  const rawStatus = getValue(formData, "status");
  const logo = getLogoFile(formData);
  const status: ClientStatus = ["active", "prospect", "inactive"].includes(rawStatus) ? rawStatus as ClientStatus : "active";

  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return { success: false, message: "Cliente inválido." };
  if (name.length < 2) return { success: false, message: "Informe um nome com pelo menos 2 caracteres." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: "Informe um e-mail válido." };
  const logoError = validateLogo(logo);
  if (logoError) return { success: false, message: logoError };

  const supabase = await createSupabaseServerClient();
  const { data: existingClient } = await supabase.from("clients").select("logo_path").eq("owner_id", user.id).eq("id", clientId).maybeSingle<{ logo_path: string | null }>();
  if (!existingClient) return { success: false, message: "Cliente não encontrado." };

  let newLogoPath: string | null = null;
  if (logo) {
    newLogoPath = `${user.id}/${clientId}/logo-${Date.now()}.${getLogoExtension(logo)}`;
    const { error: uploadError } = await supabase.storage.from("client-logos").upload(newLogoPath, logo, { contentType: logo.type, upsert: false });
    if (uploadError) return { success: false, message: "Não foi possível enviar a nova logo." };
  }

  const updates = { name, company_name: companyName || null, email: email || null, phone: phone || null, status, ...(newLogoPath ? { logo_path: newLogoPath } : {}) };
  const { data, error } = await supabase.from("clients").update(updates).eq("owner_id", user.id).eq("id", clientId).select("id").maybeSingle<{ id: string }>();
  if ((error || !data) && newLogoPath) await supabase.storage.from("client-logos").remove([newLogoPath]);
  if (error || !data) return { success: false, message: "Não foi possível atualizar o cliente agora." };

  if (newLogoPath && existingClient.logo_path) await supabase.storage.from("client-logos").remove([existingClient.logo_path]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clientes");
  return { success: true, message: "Dados do cliente atualizados.", clientId };
}

export async function deleteClientAction(clientId: string): Promise<CreateClientState> {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return { success: false, message: "Cliente inválido." };

  const supabase = await createSupabaseServerClient();
  const { data: existingClient } = await supabase.from("clients").select("logo_path").eq("owner_id", user.id).eq("id", clientId).maybeSingle<{ logo_path: string | null }>();
  if (!existingClient) return { success: false, message: "Cliente não encontrado." };
  const { data, error } = await supabase.from("clients").delete().eq("owner_id", user.id).eq("id", clientId).select("id").maybeSingle<{ id: string }>();
  if (error || !data) return { success: false, message: "Não foi possível excluir o cliente agora." };
  if (existingClient.logo_path) await supabase.storage.from("client-logos").remove([existingClient.logo_path]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clientes");
  return { success: true, message: "Cliente excluído com sucesso." };
}
