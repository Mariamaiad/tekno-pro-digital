import { PageTitle } from "@/components/admin/admin-shell";
import { getAdmin } from "@/lib/supabase/server";
import { attachContractDocument, createContract } from "@/app/admin/business-actions";
import { contractStatusLabel } from "@/lib/contracts/documents";
import { formatBRL, formatDateBR } from "@/lib/format";

export const metadata = { title: "Contratos" };
const field = "w-full rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-sm text-paper";

export default async function ContractsPage() {
  const admin = await getAdmin();
  if (!admin) return <p>Acesso não autorizado.</p>;
  const [{ data: clients }, { data: contracts, error }] = await Promise.all([
    admin.supabase.from("clients").select("id,name").order("name"),
    admin.supabase.from("contracts").select("*, clients(name)").order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageTitle title="Contratos" intro="Contratos, planos, valores, vigência, renovação e PDF vinculado ao cliente." />
      {error ? (
        <p className="rounded-xl border border-amber-400/30 p-4 text-sm text-amber-100">
          Aplique as migrations do Business Hub no Supabase para ativar este módulo.
        </p>
      ) : null}
      <form action={createContract} className="mb-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5 md:grid-cols-2">
        <h2 className="font-semibold text-paper md:col-span-2">Novo contrato</h2>
        <select name="client_id" required className={field}>
          <option value="">Selecione o cliente</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="contract_number" required placeholder="Número do contrato" className={field} />
        <input name="title" required placeholder="Título / serviço contratado" className={field} />
        <input name="plan_name" placeholder="Plano" className={field} />
        <input name="setup_fee" type="number" min="0" step="0.01" placeholder="Implantação (R$)" className={field} />
        <input name="monthly_value" type="number" min="0" step="0.01" placeholder="Mensalidade (R$)" className={field} />
        <label className="text-xs text-mist">
          Início
          <input name="start_date" type="date" required className={field} />
        </label>
        <label className="text-xs text-mist">
          Término
          <input name="end_date" type="date" className={field} />
        </label>
        <select name="renewal_type" className={field}>
          <option value="manual">Renovação manual</option>
          <option value="automatic">Renovação automática</option>
        </select>
        <select name="status" className={field}>
          <option value="draft">Rascunho</option>
          <option value="pending_signature">Aguardando assinatura</option>
          <option value="active">Ativo</option>
        </select>
        <label className="text-xs text-mist md:col-span-2">
          PDF do contrato (opcional no cadastro; também pode anexar depois)
          <input name="document" type="file" accept="application/pdf,.pdf" className={`${field} mt-1 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-paper`} />
        </label>
        <textarea name="description" placeholder="Escopo e entregáveis" className={`${field} md:col-span-2`} />
        <button className="rounded-lg bg-[#29808D] px-4 py-2 text-sm font-semibold text-white md:col-span-2">Cadastrar contrato</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-mist">
            <tr>
              {["Contrato", "Cliente", "Plano", "Mensalidade", "Status", "Vigência", "Documento"].map((x) => (
                <th key={x} className="p-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(contracts ?? []).map((c) => (
              <tr key={c.id} className="border-t border-white/10 align-top">
                <td className="p-3 text-paper">
                  {c.contract_number}
                  <div className="text-xs text-mist">{c.title}</div>
                </td>
                <td className="p-3">{c.clients?.name}</td>
                <td className="p-3">{c.plan_name || "—"}</td>
                <td className="p-3">{formatBRL(Number(c.monthly_value))}</td>
                <td className="p-3">{contractStatusLabel(c.status)}</td>
                <td className="p-3">
                  {formatDateBR(c.start_date)} {c.end_date ? `– ${formatDateBR(c.end_date)}` : ""}
                </td>
                <td className="p-3">
                  {c.document_filename ? (
                    <div className="space-y-1">
                      <p className="text-paper">{c.document_filename}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <a href={`/api/contract-documents/${c.id}`} target="_blank" rel="noreferrer" className="text-[#65D5D0] underline">
                          Visualizar
                        </a>
                        <a href={`/api/contract-documents/${c.id}?download=1`} className="text-[#65D5D0] underline">
                          Baixar
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-mist">Nenhum PDF anexado</p>
                  )}
                  <form action={attachContractDocument} className="mt-2 flex flex-col gap-2">
                    <input type="hidden" name="contract_id" value={c.id} />
                    <input name="document" type="file" accept="application/pdf,.pdf" required className="text-xs" />
                    <button className="w-fit rounded-md border border-white/15 px-2 py-1 text-xs text-paper">
                      {c.document_filename ? "Substituir PDF" : "Anexar PDF"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!contracts?.length && <p className="p-5 text-sm text-mist">Nenhum contrato cadastrado.</p>}
      </div>
    </>
  );
}
