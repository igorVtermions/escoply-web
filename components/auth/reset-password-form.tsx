"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/brand-logo";
import { showToast } from "@/components/ui/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requirements = [
    ["8 caracteres", password.length >= 8],
    ["Letra maiúscula", /[A-Z]/.test(password)],
    ["Letra minúscula", /[a-z]/.test(password)],
    ["Um número", /\d/.test(password)],
    ["Caractere especial", /[^A-Za-z0-9]/.test(password)],
  ] as const;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isStrongPassword(password)) {
      showToast({ type: "error", title: "Senha insegura", description: "Atenda a todos os requisitos antes de continuar." });
      return;
    }

    if (password !== confirmation) {
      showToast({ type: "error", title: "Senhas diferentes", description: "Digite a mesma senha nos dois campos." });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      showToast({ type: "error", title: "Não foi possível alterar", description: "Solicite um novo link e tente novamente." });
      return;
    }

    showToast({ type: "success", title: "Senha atualizada", description: "Sua nova senha já está ativa." });
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-950/10 sm:p-8">
        <BrandLogo />
        <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><LockKeyhole /></div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Crie uma nova senha</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Use uma senha forte e diferente das utilizadas anteriormente.</p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit} noValidate>
          <label className="grid gap-2 text-sm font-semibold text-slate-900">
            Nova senha
            <input className="h-12 rounded-xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            {requirements.map(([label, valid]) => <li key={label} className={`flex items-center gap-1 ${valid ? "text-emerald-700" : ""}`}><Check size={13} />{label}</li>)}
          </ul>
          <label className="grid gap-2 text-sm font-semibold text-slate-900">
            Confirme a nova senha
            <input className="h-12 rounded-xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          <button className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#071e63] font-semibold text-white transition hover:bg-[#123a9c] disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Atualizando..." : "Salvar nova senha"}{!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>
      </section>
    </main>
  );
}
