import { NextRequest, NextResponse } from "next/server";
import { createSessionClient, getAdmin } from "@/lib/supabase/server";
import { CONTRACT_DOCS_BUCKET, SIGNED_URL_TTL_SECONDS, isUuid } from "@/lib/contracts/documents";

export const dynamic = "force-dynamic";

function deny(status: number, message: string) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isUuid(id)) return deny(400, "Contrato inválido.");

  const supabase = await createSessionClient();
  if (!supabase) return deny(401, "Não autenticado.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return deny(401, "Não autenticado.");

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_id, document_path, document_filename")
    .eq("id", id)
    .maybeSingle();

  if (!contract?.document_path) return deny(404, "Documento não encontrado.");

  const expectedPrefix = `${contract.client_id}/${contract.id}/`;
  if (!contract.document_path.startsWith(expectedPrefix)) return deny(403, "Documento inválido.");

  const admin = await getAdmin();
  if (!admin) {
    const { data: link } = await supabase
      .from("client_users")
      .select("client_id")
      .eq("user_id", user.id)
      .eq("client_id", contract.client_id)
      .maybeSingle();
    if (!link) return deny(403, "Acesso não autorizado.");
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const filename = contract.document_filename || "contrato.pdf";
  const { data, error } = await supabase.storage.from(CONTRACT_DOCS_BUCKET).createSignedUrl(contract.document_path, SIGNED_URL_TTL_SECONDS, {
    download: download ? filename : false,
  });
  if (error || !data?.signedUrl) return deny(403, "Não foi possível gerar o acesso temporário.");

  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
