"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UpdateProfileResult = {
  success: boolean;
  message: string;
};

function getValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptional(value: string) {
  return value.length > 0 ? value : null;
}

function revalidateProfileViews() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/configuracoes");
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
