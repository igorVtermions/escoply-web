"use client";

import { CalendarPlus, Clipboard, Download, FileText, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { showToast } from "@/components/ui/toast-provider";
import { currencyFormatter, formatDate, sortByDueDate, sumPayments } from "./finance-utils";
import { paymentStatusLabels, paymentTypeLabels, type FinanceClientOption, type FinanceProjectOption, type Payment } from "./types";

type FinanceQuickActionsProps = {
  payments: Payment[];
  clients: FinanceClientOption[];
  projects: FinanceProjectOption[];
  today: string;
  isPending: boolean;
  onCreateReminder: (formData: FormData) => void;
};

type DialogName = "reminder" | "whatsapp" | "report" | null;
type ReportPeriod = "month" | "all";
type ReportFormat = "pdf" | "csv";

function getDefaultReminderDateTime(today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return `${date.toISOString().slice(0, 10)}T09:00`;
}

function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function getPaymentDate(payment: Payment) {
  return payment.paidAt ?? payment.dueDate;
}

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  if (!year || !monthNumber) return "Período selecionado";
  return new Date(`${year}-${monthNumber}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

function getReportPayments(payments: Payment[], period: ReportPeriod, month: string) {
  if (period === "all") return payments;
  return payments.filter((payment) => getPaymentDate(payment).startsWith(month));
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function buildChargeMessage(payment: Payment) {
  return `Olá, ${payment.clientName}. Tudo bem?\n\nPassando para lembrar sobre o recebimento "${payment.description}" do projeto ${payment.projectName}, no valor de ${currencyFormatter.format(payment.amount)}, com vencimento em ${formatDate(payment.dueDate)}.\n\nSe já tiver feito o pagamento, pode desconsiderar.`;
}

function buildManualMessage(clientName: string) {
  return `Olá, ${clientName}. Tudo bem?\n\nPassando para fazer um acompanhamento financeiro e confirmar se ficou alguma cobrança ou pagamento pendente do nosso trabalho.\n\nSe preferir, me envie o comprovante por aqui que eu atualizo o controle do projeto.`;
}

function DialogShell({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="finance-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="finance-dialog finance-action-dialog" role="dialog" aria-modal="true" aria-labelledby="finance-action-dialog-title">
        <header className="finance-dialog-header">
          <div>
            <p className="finance-dialog-eyebrow">{eyebrow}</p>
            <h2 id="finance-action-dialog-title">{title}</h2>
          </div>
          <button type="button" className="finance-dialog-close" aria-label="Fechar modal" onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

export function FinanceQuickActions({ payments, clients, projects, today, isPending, onCreateReminder }: FinanceQuickActionsProps) {
  const actionablePayments = useMemo(() => sortByDueDate(payments.filter((payment) => payment.status === "pending" || payment.status === "overdue")), [payments]);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(actionablePayments[0]?.id ?? "");
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "");
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("month");
  const [reportFormat, setReportFormat] = useState<ReportFormat>("pdf");
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));

  const effectiveSelectedPaymentId = selectedPaymentId || actionablePayments[0]?.id || "";
  const selectedPayment = actionablePayments.find((payment) => payment.id === effectiveSelectedPaymentId) ?? null;
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;
  const whatsappMessage = selectedPayment ? buildChargeMessage(selectedPayment) : selectedClient ? buildManualMessage(selectedClient.name) : "";

  function handleReminderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateReminder(new FormData(event.currentTarget));
    setDialog(null);
  }

  async function copyMessage(message: string) {
    await navigator.clipboard.writeText(message);
    showToast({ type: "success", title: "Mensagem copiada", description: "A cobrança foi copiada para a área de transferência." });
  }

  function openWhatsApp(payment: Payment, message: string) {
    const phone = normalizePhone(payment.clientWhatsapp || payment.clientPhone);
    if (!phone) {
      void copyMessage(message);
      showToast({ type: "error", title: "WhatsApp não cadastrado", description: "Cadastre o WhatsApp do cliente. A mensagem foi copiada." });
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function openManualWhatsApp(client: FinanceClientOption, message: string) {
    const phone = normalizePhone(client.whatsapp || client.phone);
    if (!phone) {
      void copyMessage(message);
      showToast({ type: "error", title: "WhatsApp não cadastrado", description: "Cadastre o WhatsApp do cliente. A mensagem foi copiada." });
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function exportReport() {
    const reportPayments = getReportPayments(payments, reportPeriod, reportMonth);
    const periodLabel = reportPeriod === "all" ? "Todo o período" : getMonthLabel(reportMonth);
    const paid = sumPayments(reportPayments.filter((payment) => payment.status === "paid"));
    const pending = sumPayments(reportPayments.filter((payment) => payment.status === "pending"));
    const overdue = sumPayments(reportPayments.filter((payment) => payment.status === "overdue"));
    const total = sumPayments(reportPayments);

    if (reportFormat === "csv") {
      const rows = [
        ["Cliente", "Projeto", "Descrição", "Tipo", "Vencimento", "Valor", "Status", "Recebido em"],
        ...reportPayments.map((payment) => [
          payment.clientName,
          payment.projectName,
          payment.description,
          paymentTypeLabels[payment.type],
          formatDate(payment.dueDate),
          currencyFormatter.format(payment.amount),
          paymentStatusLabels[payment.status],
          formatDate(payment.paidAt),
        ]),
      ];
      const csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
      downloadTextFile(`escoply-financeiro-${reportPeriod === "all" ? "todo-periodo" : reportMonth}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
      showToast({ type: "success", title: "CSV gerado", description: "O relatório financeiro foi baixado." });
      setDialog(null);
      return;
    }

    const rows = reportPayments.map((payment) => `<tr><td>${escapeHtml(payment.clientName)}</td><td>${escapeHtml(payment.projectName)}</td><td>${escapeHtml(payment.description)}</td><td>${escapeHtml(paymentTypeLabels[payment.type])}</td><td>${formatDate(payment.dueDate)}</td><td>${currencyFormatter.format(payment.amount)}</td><td>${escapeHtml(paymentStatusLabels[payment.status])}</td></tr>`).join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório financeiro - Escoply</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#071542;background:#f8fafc}.page{min-height:100vh;padding:32px;border:1px solid #e2e8f0;border-radius:24px;background:radial-gradient(circle at 100% 0,rgba(139,92,246,.16),transparent 32%),#fff}.brand{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand small{color:#64748b;font-weight:700}.brand h1{margin:0;font-size:28px;letter-spacing:-.04em}.hero{margin-top:28px;padding:24px;border-radius:22px;color:#fff;background:linear-gradient(135deg,#071e63,#6d28d9)}.hero span{font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#c4b5fd}.hero h2{margin:8px 0 0;font-size:34px;line-height:1.05}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.summary article{padding:16px;border:1px solid #e2e8f0;border-radius:18px;background:#fff}.summary span{display:block;color:#64748b;font-size:12px;font-weight:800}.summary strong{display:block;margin-top:8px;font-size:18px}table{width:100%;margin-top:22px;border-collapse:collapse;font-size:12px}th,td{padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}th{color:#64748b;font-size:11px;text-transform:uppercase}.footer{display:flex;justify-content:space-between;margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px}@media print{body{background:#fff}.page{border:0;border-radius:0;padding:0}}</style></head><body><main class="page"><section class="brand"><div><small>Escoply Web</small><h1>Relatório financeiro</h1></div><small>Gerado em ${new Date().toLocaleDateString("pt-BR")}</small></section><section class="hero"><span>${escapeHtml(periodLabel)}</span><h2>Recebimentos, cobranças e pagamentos</h2></section><section class="summary"><article><span>Recebido</span><strong>${currencyFormatter.format(paid)}</strong></article><article><span>Pendente</span><strong>${currencyFormatter.format(pending)}</strong></article><article><span>Atrasado</span><strong>${currencyFormatter.format(overdue)}</strong></article><article><span>Total previsto</span><strong>${currencyFormatter.format(total)}</strong></article></section><table><thead><tr><th>Cliente</th><th>Projeto</th><th>Descrição</th><th>Tipo</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>${rows || "<tr><td colspan='7'>Nenhum recebimento no período.</td></tr>"}</tbody></table><section class="footer"><span>Do briefing à entrega, tudo no controle.</span><span>${escapeHtml(periodLabel)}</span></section></main></body></html>`;
    const frame = document.createElement("iframe");
    frame.title = "Relatório financeiro para impressão";
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument;
    const frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) {
      frame.remove();
      showToast({ type: "error", title: "PDF não gerado", description: "Não foi possível preparar o relatório." });
      return;
    }
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
    setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      setTimeout(() => frame.remove(), 1000);
    }, 250);
    showToast({ type: "success", title: "PDF preparado", description: "Use a janela de impressão para salvar o relatório em PDF." });
    setDialog(null);
  }

  return (
    <>
      <section className="finance-side-card">
        <header><h2>Ações rápidas</h2></header>
        <div className="finance-quick-actions">
          <button type="button" onClick={() => setDialog("reminder")}>
            <CalendarPlus size={16} />
            Gerar lembrete de cobrança
          </button>
          <button type="button" onClick={() => setDialog("whatsapp")}>
            <MessageCircle size={16} />
            Criar mensagem para WhatsApp
          </button>
          <button type="button" onClick={() => setDialog("report")}>
            <Download size={16} />
            Exportar relatório
          </button>
        </div>
      </section>

      {dialog === "reminder" && (
        <DialogShell title="Gerar lembrete de cobrança" eyebrow="Ação rápida" onClose={() => setDialog(null)}>
          <form className="finance-dialog-form" onSubmit={handleReminderSubmit}>
            {actionablePayments.length > 0 && (
              <label className="finance-dialog-field">
                <span>Usar cobrança existente</span>
                <select name="paymentId" value={selectedPayment?.id ?? ""} onChange={(event) => setSelectedPaymentId(event.target.value)}>
                  <option value="">Criar lembrete manual</option>
                  {actionablePayments.map((payment) => <option key={payment.id} value={payment.id}>{payment.clientName} · {payment.description} · {currencyFormatter.format(payment.amount)}</option>)}
                </select>
              </label>
            )}
            {selectedPayment ? (
              <input type="hidden" name="projectId" value={selectedPayment.projectId} />
            ) : (
              <label className="finance-dialog-field">
                <span>Projeto</span>
                <select name="projectId" value={selectedProject?.id ?? ""} onChange={(event) => setSelectedProjectId(event.target.value)} required>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.clientName}</option>)}
                </select>
              </label>
            )}
            <label className="finance-dialog-field">
              <span>Título</span>
              <input name="title" defaultValue={selectedPayment ? `Cobrar ${selectedPayment.description} · ${selectedPayment.clientName}` : selectedProject ? `Cobrança · ${selectedProject.name}` : ""} placeholder="Ex.: Cobrar sinal do projeto" required minLength={2} />
            </label>
            <label className="finance-dialog-field">
              <span>Quando lembrar</span>
              <input name="scheduledAt" type="datetime-local" defaultValue={getDefaultReminderDateTime(today)} required />
            </label>
            <footer className="finance-dialog-actions">
              <button type="button" className="finance-dialog-secondary" onClick={() => setDialog(null)}>Cancelar</button>
              <button type="submit" className="finance-dialog-primary" disabled={isPending || (!selectedPayment && !selectedProject)}>{isPending ? "Criando..." : "Criar lembrete"}</button>
            </footer>
          </form>
        </DialogShell>
      )}

      {dialog === "whatsapp" && (
        <DialogShell title="Mensagem para WhatsApp" eyebrow="Cobrança" onClose={() => setDialog(null)}>
          <div className="finance-dialog-form">
            {actionablePayments.length > 0 && (
              <label className="finance-dialog-field">
                <span>Usar cobrança existente</span>
                <select value={selectedPayment?.id ?? ""} onChange={(event) => setSelectedPaymentId(event.target.value)}>
                  <option value="">Criar mensagem manual</option>
                  {actionablePayments.map((payment) => <option key={payment.id} value={payment.id}>{payment.clientName} · {payment.description} · {currencyFormatter.format(payment.amount)}</option>)}
                </select>
              </label>
            )}
            {!selectedPayment && (
              <label className="finance-dialog-field">
                <span>Cliente</span>
                <select value={selectedClient?.id ?? ""} onChange={(event) => setSelectedClientId(event.target.value)} required>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </label>
            )}
            <label className="finance-dialog-field">
              <span>Mensagem</span>
              <textarea className="finance-message-preview" value={whatsappMessage} readOnly rows={8} />
            </label>
            <footer className="finance-dialog-actions">
              <button type="button" className="finance-dialog-secondary" onClick={() => { void copyMessage(whatsappMessage); }} disabled={!whatsappMessage}>
                <Clipboard size={16} />
                Copiar
              </button>
              <button type="button" className="finance-dialog-primary" onClick={() => {
                if (selectedPayment) {
                  openWhatsApp(selectedPayment, whatsappMessage);
                  return;
                }
                if (selectedClient) openManualWhatsApp(selectedClient, whatsappMessage);
              }} disabled={!whatsappMessage || (!selectedPayment && !selectedClient)}>
                <MessageCircle size={16} />
                Abrir WhatsApp
              </button>
            </footer>
          </div>
        </DialogShell>
      )}

      {dialog === "report" && (
        <DialogShell title="Exportar relatório financeiro" eyebrow="Relatório" onClose={() => setDialog(null)}>
          <div className="finance-dialog-form">
            <div className="finance-dialog-grid">
              <label className="finance-dialog-field">
                <span>Formato</span>
                <select value={reportFormat} onChange={(event) => setReportFormat(event.target.value as ReportFormat)}>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                </select>
              </label>
              <label className="finance-dialog-field">
                <span>Período</span>
                <select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value as ReportPeriod)}>
                  <option value="month">Mês específico</option>
                  <option value="all">Todo o período</option>
                </select>
              </label>
            </div>
            {reportPeriod === "month" && (
              <label className="finance-dialog-field">
                <span>Mês do relatório</span>
                <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
              </label>
            )}
            <div className="finance-report-preview">
              <FileText size={18} />
              <span>{getReportPayments(payments, reportPeriod, reportMonth).length} recebimentos serão incluídos no relatório.</span>
            </div>
            <footer className="finance-dialog-actions">
              <button type="button" className="finance-dialog-secondary" onClick={() => setDialog(null)}>Cancelar</button>
              <button type="button" className="finance-dialog-primary" onClick={exportReport}>Gerar relatório</button>
            </footer>
          </div>
        </DialogShell>
      )}
    </>
  );
}
