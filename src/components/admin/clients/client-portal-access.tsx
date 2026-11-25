import { createClientPortalAccess } from "@/app/admin/client-portal-actions";

const messages: Record<string, string> = {
  invited: "Convite enviado por e-mail e acesso vinculado ao cadastro.",
  linked: "Conta existente vinculada ao cliente. O usuário já pode entrar no portal.",
  invalid: "Informe um e-mail válido.",
  config: "A chave de serviço do Supabase não está configurada no servidor.",
  client: "Não foi possível localizar este cliente.",
  inviteError: "Não foi possível enviar o convite. Verifique se o e-mail já está cadastrado ou as configurações de e-mail do Supabase.",
  linkError: "A conta foi localizada/criada, mas o vínculo não foi salvo. Confira as permissões da tabela client_users.",
  error: "Não foi possível consultar as contas do portal. Tente novamente.",
};

export function ClientPortalAccess({ clientId, email, status, readOnly = false }: { clientId: string; email: string | null; status?: string; readOnly?: boolean }) {
  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="text-base font-semibold text-paper">Acesso ao Portal do Cliente</h2>
      <p className="mt-1 text-sm text-mist">Envie um convite para o e-mail do cliente e vincule automaticamente a conta à empresa.</p>
      {status && messages[status] && (
        <p role="status" className={`mt-3 rounded-lg p-3 text-sm ${status === "invited" || status === "linked" ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-400/10 text-amber-100"}`}>
          {messages[status]}
        </p>
      )}
      <form action={createClientPortalAccess} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="client_id" value={clientId} />
        <label className="flex-1 text-sm text-mist">
          E-mail de acesso
          <input name="email" type="email" required defaultValue={email ?? ""} placeholder="cliente@empresa.com" disabled={readOnly} className="mt-1 w-full rounded-lg border border-white/10 bg-[#102C42] px-3 py-2 text-paper placeholder:text-mist/60 disabled:opacity-50" />
        </label>
        <button type="submit" disabled={readOnly} className="rounded-lg bg-[#29808D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          Criar acesso / enviar convite
        </button>
      </form>
      <p className="mt-2 text-xs text-mist/80">Se o e-mail já tiver uma conta, ela será vinculada sem criar outro usuário.</p>
    </section>
  );
}
