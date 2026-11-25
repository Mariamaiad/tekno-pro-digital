export const CONTRACT_DOCS_BUCKET = "contract-documents";
export const MAX_CONTRACT_PDF_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 120;

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  active: "Ativo",
  suspended: "Suspenso",
  expired: "Encerrado",
  cancelled: "Cancelado",
};

export function contractStatusLabel(status: string) {
  return CONTRACT_STATUS_LABEL[status] ?? status;
}

export function sanitizeContractFilename(name: string) {
  const cleaned = name.replace(/[/\\]/g, "").replace(/\s+/g, " ").trim();
  const base = cleaned || "contrato.pdf";
  return base.slice(0, 180);
}

export function contractObjectPath(clientId: string, contractId: string) {
  return `${clientId}/${contractId}/${crypto.randomUUID()}.pdf`;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function readPdfBytes(file: File) {
  if (file.size <= 0) throw new Error("O arquivo PDF está vazio.");
  if (file.size > MAX_CONTRACT_PDF_BYTES) throw new Error("O PDF deve ter no máximo 10 MB.");
  const filename = sanitizeContractFilename(file.name);
  const looksPdf = file.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  if (!looksPdf) throw new Error("Envie apenas arquivos PDF.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
  if (header !== "%PDF") throw new Error("O arquivo enviado não é um PDF válido.");
  return { bytes, filename, size: file.size };
}
