"use client";

import { driveScope, folderMime, type DriveSelection } from "./drive-model";

export type PickerConfig = { clientId: string; apiKey: string; appId: string; email: string };
type PickerResponse = { action: string; docs?: Array<{ id: string; resourceKey?: string }> };
type Picker = { setVisible(visible: boolean): void; dispose(): void };
type View = { setIncludeFolders(value: boolean): View; setSelectFolderEnabled(value: boolean): View; setMimeTypes(value: string): View };
type Builder = {
  addView(view: View): Builder; setAppId(id: string): Builder; setDeveloperKey(key: string): Builder;
  setOAuthToken(token: string): Builder; setOrigin(origin: string): Builder; setLocale(locale: string): Builder;
  setTitle(title: string): Builder; setCallback(callback: (response: PickerResponse) => void): Builder; build(): Picker;
};
type GoogleWindow = Window & {
  gapi?: { load(name: string, options: { callback(): void; onerror(): void; timeout: number; ontimeout(): void }): void };
  google?: {
    picker?: { DocsView: new () => View; PickerBuilder: new () => Builder };
    accounts?: { oauth2: { initTokenClient(options: {
      client_id: string; scope: string; include_granted_scopes: boolean;
      callback(response: { access_token?: string; scope?: string; error?: string }): void;
      error_callback(error: { type: string }): void;
    }): { requestAccessToken(options: { prompt: string }): void } } };
  };
};
const scripts = new Map<string, Promise<void>>();
function loadScript(src: string) {
  const cached = scripts.get(src);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(fail, 15000);
    function fail() { clearTimeout(timer); script.remove(); scripts.delete(src); reject(new Error("Não foi possível carregar o seletor Google. Verifique a conexão ou o bloqueador de conteúdo.")); }
    script.src = src; script.async = true;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  scripts.set(src, promise);
  return promise;
}
let ready: Promise<void> | undefined;
export function prepareDrivePicker() {
  if (!ready) ready = (async () => {
    await Promise.all([loadScript("https://apis.google.com/js/api.js"), loadScript("https://accounts.google.com/gsi/client")]);
    const api = (window as GoogleWindow).gapi;
    if (!api) throw new Error("Seletor Google indisponível.");
    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error("Não foi possível iniciar o seletor Google."));
      api.load("picker", { callback: resolve, onerror: fail, timeout: 15000, ontimeout: fail });
    });
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}

// Call directly from a user click after prepareDrivePicker, so the OAuth popup is not blocked.
// The ephemeral browser token covers drive.file only, never Calendar/Tasks. Nothing is stored.
export function openDrivePicker(config: PickerConfig, folders: boolean, signal: AbortSignal): Promise<DriveSelection | null> {
  return new Promise((resolve, reject) => {
    const google = (window as GoogleWindow).google;
    if (!google?.accounts || !google.picker) { reject(new Error("O seletor ainda não está pronto. Tente novamente.")); return; }
    const pickerApi = google.picker;
    let picker: Picker | undefined;
    let finished = false;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const finish = (selection: DriveSelection | null, error?: Error) => {
      if (finished) return;
      finished = true;
      signal.removeEventListener("abort", cancel);
      picker?.dispose();
      if (trigger?.isConnected) trigger.focus();
      if (error) reject(error); else resolve(selection);
    };
    const cancel = () => finish(null);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) { cancel(); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: config.clientId, scope: driveScope, include_granted_scopes: false,
      error_callback: error => finish(null, error.type === "popup_closed" ? undefined : new Error("Permita a janela do Google e tente novamente.")),
      callback: response => {
        if (finished) return;
        if (response.error || !response.access_token || !response.scope?.split(" ").includes(driveScope)) {
          finish(null, new Error("Autorize os arquivos selecionados para abrir o Drive.")); return;
        }
        try {
          const view = new pickerApi.DocsView().setIncludeFolders(folders).setSelectFolderEnabled(folders);
          if (folders) view.setMimeTypes(folderMime);
          picker = new pickerApi.PickerBuilder().addView(view).setAppId(config.appId).setDeveloperKey(config.apiKey)
            .setOAuthToken(response.access_token).setOrigin(window.location.origin).setLocale("pt-BR")
            .setTitle(folders ? "Vincular pasta ao projeto" : "Adicionar arquivo aos materiais")
            .setCallback(result => {
              if (result.action === "cancel") finish(null);
              if (result.action === "picked") {
                const file = result.docs?.[0];
                finish(file ? { id: file.id, ...(file.resourceKey ? { resourceKey: file.resourceKey } : {}) } : null);
              }
            }).build();
          picker.setVisible(true);
        } catch { finish(null, new Error("Não foi possível abrir o Drive. Confira a configuração do seletor.")); }
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}
