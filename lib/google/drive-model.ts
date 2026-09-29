export const driveScope = "https://www.googleapis.com/auth/drive.file";
export const folderMime = "application/vnd.google-apps.folder";
export type DriveSelection = { id: string; resourceKey?: string };
export type DriveFile = { id: string; name: string; mimeType: string; trashed?: boolean; resourceKey?: string };
export type DriveStatus = { connected: boolean; email: string | null; reconnect: boolean };
export type DriveFolder = { name: string; url: string };

export function validateDriveSelection(value: DriveSelection) {
  if (!value || typeof value.id !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(value.id)
    || (value.resourceKey !== undefined && (typeof value.resourceKey !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(value.resourceKey)))) {
    throw new Error("Selecione um arquivo válido no Google Drive.");
  }
}
export function driveFileUrl(file: DriveFile, resourceKey?: string) {
  validateDriveSelection({ id: file.id, resourceKey });
  if (file.trashed || !file.name || !file.mimeType) throw new Error("Arquivo indisponível ou na lixeira do Drive.");
  const url = new URL(file.mimeType === folderMime
    ? `https://drive.google.com/drive/folders/${file.id}` : `https://drive.google.com/file/d/${file.id}/view`);
  if (resourceKey) url.searchParams.set("resourcekey", resourceKey);
  return url.toString();
}
