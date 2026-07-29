"use client";

import { LockKeyhole, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { showToast } from "@/components/ui/toast-provider";
import { SettingsSectionShell } from "./settings-section-shell";

export function SecuritySettings() {
  return (
    <SettingsSectionShell icon={LockKeyhole} title="Segurança" description="Gerencie acesso, senha e proteção da sua conta.">
      <div className="settings-action-list">
        <article><span><LockKeyhole size={18} /><strong>Alterar senha</strong><small>Atualize sua senha de acesso ao Escoply.</small></span><button type="button">Alterar</button></article>
        <article><span><ShieldCheck size={18} /><strong>Sessões ativas</strong><small>Gerenciamento de dispositivos conectados futuramente.</small></span><em>Em breve</em></article>
        <article><span><ShieldCheck size={18} /><strong>Autenticação em duas etapas</strong><small>Camada extra de segurança planejada.</small></span><em>Em breve</em></article>
        <article><span><LogOut size={18} /><strong>Sair da conta</strong><small>Encerra a sessão atual pelo menu superior.</small></span><button type="button" onClick={() => showToast({ type: "success", title: "Use o botão sair", description: "A confirmação de saída já existe no topo do dashboard." })}>Ver saída</button></article>
        <article className="danger"><span><Trash2 size={18} /><strong>Excluir conta</strong><small>Remoção definitiva exigirá confirmação em etapa futura.</small></span><button type="button">Solicitar</button></article>
      </div>
    </SettingsSectionShell>
  );
}
