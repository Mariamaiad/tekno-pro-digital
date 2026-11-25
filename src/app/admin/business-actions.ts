"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin, createSessionClient } from "@/lib/supabase/server";
import {
  CONTRACT_DOCS_BUCKET,
  contractObjectPath,
  isUuid,
  readPdfBytes,
} from "@/lib/contracts/documents";
import type { SupabaseClient } from "@supabase/supabase-js";

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
const num = (f: FormData, key: string) => Number(String(f.get(key) ?? "0").replace(",", "."));
const dateOrNull = (v: string) => v || null;

type AdminClient = SupabaseClient;

async function storeContractPdf(admin: AdminClient, clientId: string, contractId: string, file: File, previousPath?: string | null) {
  const { bytes, filename, size } = await readPdfBytes(file);
  const path = contractObjectPath(clientId, contractId);
  const { error: uploadError } = await admin.storage.from(CONTRACT_DOCS_BUCKET).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) throw new Error("Não foi possível enviar o PDF. Confirme se a migration de documentos foi aplicada.");
  const { error: updateError } = await admin.from("contracts").update({
    document_path: path,
    document_filename: filename,
    document_size: size,
    document_uploaded_at: new Date().toISOString(),
    document_url: null,
  }).eq("id", contractId).eq("client_id", clientId);
  if (updateError) {
    await admin.storage.from(CONTRACT_DOCS_BUCKET).remove([path]);
    throw new Error(updateError.message);
  }
  if (previousPath && previousPath !== path) {
    await admin.storage.from(CONTRACT_DOCS_BUCKET).remove([previousPath]);
  }
}

export async function createContract(formData: FormData) {
  const admin = await getAdmin(); if (!admin) redirect("/admin/login");
  const client_id=text(formData,"client_id"), title=text(formData,"title"), contract_number=text(formData,"contract_number");
  if (!client_id || !title || !contract_number) throw new Error("Preencha cliente, número e título do contrato.");
  if (!isUuid(client_id)) throw new Error("Cliente inválido.");
  const { data, error } = await admin.supabase.from("contracts").insert({ client_id, title, contract_number, description:text(formData,"description"), plan_name:text(formData,"plan_name"), setup_fee:num(formData,"setup_fee"), monthly_value:num(formData,"monthly_value"), start_date:text(formData,"start_date"), end_date:dateOrNull(text(formData,"end_date")), status:text(formData,"status") || "draft", renewal_type:text(formData,"renewal_type") || "manual" }).select("id, client_id").single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível cadastrar o contrato.");
  const file = formData.get("document");
  if (file instanceof File && file.size > 0) {
    await storeContractPdf(admin.supabase, data.client_id, data.id, file);
  }
  revalidatePath("/admin/contratos"); revalidatePath("/admin"); revalidatePath("/portal");
}

export async function attachContractDocument(formData: FormData) {
  const admin = await getAdmin(); if (!admin) redirect("/admin/login");
  const contract_id = text(formData, "contract_id");
  if (!isUuid(contract_id)) throw new Error("Contrato inválido.");
  const file = formData.get("document");
  if (!(file instanceof File) || file.size <= 0) throw new Error("Selecione o PDF do contrato.");
  const { data: contract, error } = await admin.supabase.from("contracts").select("id, client_id, document_path").eq("id", contract_id).maybeSingle();
  if (error || !contract) throw new Error("Contrato não encontrado.");
  await storeContractPdf(admin.supabase, contract.client_id, contract.id, file, contract.document_path);
  revalidatePath("/admin/contratos"); revalidatePath("/portal");
}

export async function createMarketingItem(formData: FormData) {
  const admin = await getAdmin(); if (!admin) redirect("/admin/login");
  const client_id=text(formData,"client_id"), title=text(formData,"title");
  if (!client_id || !title) throw new Error("Selecione o cliente e informe o título.");
  const { error } = await admin.supabase.from("marketing_calendar").insert({ client_id, title, platform:text(formData,"platform") || "Instagram", content_type:text(formData,"content_type") || "Reels", objective:text(formData,"objective"), caption:text(formData,"caption"), script:text(formData,"script"), scheduled_at:dateOrNull(text(formData,"scheduled_at")), status:text(formData,"status") || "idea", created_by:admin.user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/marketing"); revalidatePath("/portal");
}

export async function updateMarketingStatus(formData: FormData) {
  const admin = await getAdmin(); if (!admin) redirect("/admin/login");
  const id=text(formData,"id"), status=text(formData,"status");
  if (!id || !["idea","planning","production","review","approved","scheduled","published","changes_requested","cancelled"].includes(status)) throw new Error("Status inválido.");
  const { error } = await admin.supabase.from("marketing_calendar").update({status}).eq("id",id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/marketing"); revalidatePath("/portal");
}

export async function createTransaction(formData: FormData) {
  const admin = await getAdmin(); if (!admin) redirect("/admin/login");
  const kind=text(formData,"kind"), amount=num(formData,"amount"), description=text(formData,"description");
  if (!description || amount <= 0 || !["income","expense"].includes(kind)) throw new Error("Confira descrição, tipo e valor.");
  const { error } = await admin.supabase.from("financial_transactions").insert({ kind, amount, description, category:text(formData,"category") || "Geral", client_id:dateOrNull(text(formData,"client_id")), competence_date:text(formData,"competence_date"), due_date:dateOrNull(text(formData,"due_date")), status:text(formData,"status") || "pending", notes:text(formData,"notes") });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/financeiro"); revalidatePath("/admin");
}

export async function createInvoice(formData: FormData) {
  const admin = await getAdmin(); if (!admin) redirect("/admin/login");
  const client_id=text(formData,"client_id"), description=text(formData,"description"), amount=num(formData,"amount"), due_date=text(formData,"due_date");
  if (!client_id || !description || amount <= 0 || !due_date) throw new Error("Preencha cliente, descrição, valor e vencimento.");
  const { error } = await admin.supabase.from("invoices").insert({client_id, description, amount, due_date, status:"pending", contract_id:dateOrNull(text(formData,"contract_id"))});
  if (error) throw new Error(error.message);
  revalidatePath("/admin/financeiro"); revalidatePath("/portal");
}

export async function clientReview(formData: FormData) {
  const supabase = await createSessionClient(); if (!supabase) redirect("/portal/login");
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/portal/login");
  const id=text(formData,"id"), decision=text(formData,"decision"), feedback=text(formData,"feedback");
  const { error } = await supabase.rpc("client_review_content", {target_id:id, decision, feedback_text:feedback});
  if (error) throw new Error("Não foi possível registrar sua avaliação. Verifique seu acesso.");
  revalidatePath("/portal");
}

export async function clientSignIn(formData: FormData) {
  const supabase = await createSessionClient(); if (!supabase) redirect("/portal/login?error=config");
  const email=text(formData,"email"), password=text(formData,"password");
  const { error } = await supabase.auth.signInWithPassword({email,password});
  if (error) redirect("/portal/login?error=credentials");
  redirect("/portal");
}

export async function clientSignOut() {
  const supabase=await createSessionClient(); await supabase?.auth.signOut(); redirect("/portal/login");
}

export async function updateInvoiceStatus(formData: FormData) {
  const admin=await getAdmin(); if(!admin) redirect("/admin/login");
  const id=text(formData,"id"), status=text(formData,"status");
  if(!id || !["pending","paid","overdue","cancelled","partial"].includes(status)) throw new Error("Status inválido.");
  const {error}=await admin.supabase.from("invoices").update({status,paid_at:status==="paid"?new Date().toISOString().slice(0,10):null}).eq("id",id);
  if(error) throw new Error(error.message);
  revalidatePath("/admin/financeiro"); revalidatePath("/portal");
}

export async function updateTransactionStatus(formData: FormData) {
  const admin=await getAdmin(); if(!admin) redirect("/admin/login");
  const id=text(formData,"id"), status=text(formData,"status");
  if(!id || !["pending","paid","overdue","cancelled"].includes(status)) throw new Error("Status inválido.");
  const {error}=await admin.supabase.from("financial_transactions").update({status,paid_at:status==="paid"?new Date().toISOString().slice(0,10):null}).eq("id",id);
  if(error) throw new Error(error.message);
  revalidatePath("/admin/financeiro");
}

export async function createClientRequest(formData: FormData) {
  const supabase=await createSessionClient(); if(!supabase) redirect("/portal/login");
  const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/portal/login");
  const subject=text(formData,"subject"), message=text(formData,"message"), client_id=text(formData,"client_id");
  if(!subject || !message || !client_id) throw new Error("Preencha o assunto e a mensagem.");
  const {error}=await supabase.from("client_requests").insert({client_id,subject,message});
  if(error) throw new Error("Não foi possível enviar sua solicitação.");
  revalidatePath("/portal");
}

export async function updateClientRequest(formData: FormData) {
  const admin=await getAdmin(); if(!admin) redirect("/admin/login");
  const id=text(formData,"id"), status=text(formData,"status"), response=text(formData,"response");
  if(!id || !["open","in_progress","answered","closed"].includes(status)) throw new Error("Dados inválidos.");
  const {error}=await admin.supabase.from("client_requests").update({status,response}).eq("id",id);
  if(error) throw new Error(error.message);
  revalidatePath("/admin/solicitacoes"); revalidatePath("/portal");
}
