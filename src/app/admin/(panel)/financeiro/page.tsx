
import { PageTitle } from "@/components/admin/admin-shell";
import { getAdmin } from "@/lib/supabase/server";
import {
  createInvoice,
  createTransaction,
  updateInvoiceStatus,
  updateTransactionStatus,
} from "@/app/admin/business-actions";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Financeiro" };

const field =
  "w-full rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-sm text-paper";

export default async function FinancePage() {
  const admin = await getAdmin();

  if (!admin) return <p>Acesso não autorizado.</p>;

  const [
    { data: clients, error: clientsError },
    { data: transactions, error },
    { data: invoices, error: invoicesError },
  ] = await Promise.all([
    admin.supabase
      .from("clients")
      .select("id, name")
      .order("name"),

    admin.supabase
      .from("financial_transactions")
      .select(
        "id, competence_date, description, kind, amount, status, client_id, clients(name)"
      )
      .order("competence_date", { ascending: false })
      .limit(100),

    admin.supabase
      .from("invoices")
      .select(
        "id, description, amount, due_date, status, client_id, clients(name)"
      )
      .order("due_date", { ascending: false })
      .limit(100),
  ]);

  if (clientsError) throw new Error(clientsError.message);
  if (invoicesError) throw new Error(invoicesError.message);

  const rows = transactions ?? [];
  const invoiceRows = invoices ?? [];

  const income = rows
    .filter((x) => x.kind === "income" && x.status === "paid")
    .reduce((total, x) => total + Number(x.amount), 0);

  const expenses = rows
    .filter((x) => x.kind === "expense" && x.status === "paid")
    .reduce((total, x) => total + Number(x.amount), 0);

  const pending = invoiceRows
    .filter((x) => x.status === "pending" || x.status === "overdue")
    .reduce((total, x) => total + Number(x.amount), 0);

  return (
    <>
      <PageTitle
        title="Financeiro"
        intro="Controle receitas, despesas, cobranças, vencimentos e resultado da agência."
      />

      {error && (
        <p className="mb-5 rounded-xl border border-amber-400/30 p-4 text-sm text-amber-100">
          Aplique a migration Business Hub no Supabase para ativar este módulo.
        </p>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Receitas recebidas", v: formatBRL(income) },
          { t: "Despesas pagas", v: formatBRL(expenses) },
          { t: "Cobranças em aberto", v: formatBRL(pending) },
        ].map((x) => (
          <div
            key={x.t}
            className="rounded-xl border border-white/10 p-4"
          >
            <p className="text-xs text-mist">{x.t}</p>
            <p className="mt-2 text-2xl font-semibold text-paper">
              {x.v}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          action={createTransaction}
          className="grid gap-3 rounded-xl border border-white/10 p-5"
        >
          <h2 className="font-semibold text-paper">Novo lançamento</h2>

          <select name="kind" className={field}>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>

          <input
            name="description"
            required
            placeholder="Descrição"
            className={field}
          />

          <input
            name="category"
            placeholder="Categoria"
            className={field}
          />

          <input
            name="amount"
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Valor R$"
            className={field}
          />

          <select name="client_id" className={field}>
            <option value="">Sem cliente vinculado</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="text-xs text-mist">
            Competência
            <input
              name="competence_date"
              type="date"
              required
              className={field}
            />
          </label>

          <label className="text-xs text-mist">
            Vencimento
            <input
              name="due_date"
              type="date"
              className={field}
            />
          </label>

          <select name="status" className={field}>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="overdue">Atrasado</option>
          </select>

          <textarea
            name="notes"
            placeholder="Observações"
            className={field}
          />

          <button className="rounded-lg bg-[#29808D] px-4 py-2 text-sm font-semibold text-white">
            Salvar lançamento
          </button>
        </form>

        <form
          action={createInvoice}
          className="grid content-start gap-3 rounded-xl border border-white/10 p-5"
        >
          <h2 className="font-semibold text-paper">
            Nova cobrança de cliente
          </h2>

          <select name="client_id" required className={field}>
            <option value="">Selecione o cliente</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            name="description"
            required
            placeholder="Descrição da cobrança"
            className={field}
          />

          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="Valor R$"
            className={field}
          />

          <label className="text-xs text-mist">
            Vencimento
            <input
              name="due_date"
              type="date"
              required
              className={field}
            />
          </label>

          <button className="rounded-lg bg-[#29808D] px-4 py-2 text-sm font-semibold text-white">
            Gerar cobrança
          </button>

          <p className="text-xs text-mist">
            A cobrança fica registrada no portal do cliente. Este módulo
            ainda não processa pagamentos automaticamente.
          </p>
        </form>
      </div>

      <h2 className="mb-3 mt-8 font-semibold text-paper">
        Movimentações
      </h2>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-mist">
            <tr>
              {["Data", "Descrição", "Cliente", "Tipo", "Valor", "Status"].map(
                (x) => (
                  <th key={x} className="p-3">
                    {x}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="p-3">{r.competence_date}</td>

                <td className="p-3 text-paper">{r.description}</td>

                <td className="p-3">{r.clients?.[0]?.name ?? "—"}</td>

                <td className="p-3">
                  {r.kind === "income" ? "Receita" : "Despesa"}
                </td>

                <td className="p-3">
                  {formatBRL(Number(r.amount))}
                </td>

                <td className="p-3">
                  <form
                    action={updateTransactionStatus}
                    className="flex gap-1"
                  >
                    <input type="hidden" name="id" value={r.id} />

                    <select
                      name="status"
                      defaultValue={r.status}
                      className="rounded bg-[#101827] px-2 py-1 text-xs"
                    >
                      {["pending", "paid", "overdue", "cancelled"].map(
                        (x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        )
                      )}
                    </select>

                    <button className="text-xs text-[#65D5D0]">
                      Salvar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!rows.length && (
          <p className="p-4 text-sm text-mist">
            Nenhum lançamento cadastrado.
          </p>
        )}
      </div>

      <h2 className="mb-3 mt-8 font-semibold text-paper">
        Cobranças de clientes
      </h2>

      <div className="space-y-2">
        {invoiceRows.map((i) => (
          <div
            key={i.id}
            className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm"
          >
            <span className="text-paper">
            {i.clients?.[0]?.name ?? "Cliente"} · {i.description}
            </span>

            <form
              action={updateInvoiceStatus}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="id" value={i.id} />

              <span>
                {formatBRL(Number(i.amount))} · vence {i.due_date}
              </span>

              <select
                name="status"
                defaultValue={i.status}
                className="rounded bg-[#101827] px-2 py-1 text-xs text-white"
              >
                {["pending", "paid", "overdue", "cancelled", "partial"].map(
                  (x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  )
                )}
              </select>

              <button className="text-xs text-[#65D5D0]">
                Salvar
              </button>
            </form>
          </div>
        ))}

        {!invoiceRows.length && (
          <p className="rounded-lg border border-white/10 p-4 text-sm text-mist">
            Nenhuma cobrança cadastrada.
          </p>
        )}
      </div>
    </>
  );
}
