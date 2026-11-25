
import { PageTitle } from "@/components/admin/admin-shell";
import { getAdmin } from "@/lib/supabase/server";
import {
  createMarketingItem,
  updateMarketingStatus,
} from "@/app/admin/business-actions";

export const metadata = { title: "Calendário de marketing" };

const field =
  "w-full rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-sm text-paper";

export default async function MarketingPage() {
  const admin = await getAdmin();

  if (!admin) return <p>Acesso não autorizado.</p>;

  const [
    { data: clients, error: clientsError },
    { data: items, error },
  ] = await Promise.all([
    admin.supabase
      .from("clients")
      .select("id, name")
      .order("name"),

    admin.supabase
      .from("marketing_calendar")
      .select(
        "id, title, platform, content_type, scheduled_at, status, caption, script, objective, client_feedback, client_id, clients(name)"
      )
      .order("scheduled_at", { ascending: true })
      .limit(100),
  ]);

  if (clientsError) throw new Error(clientsError.message);

  return (
    <>
      <PageTitle
        title="Calendário de marketing"
        intro="Organize publicações por cliente, plataforma, formato, data e etapa de aprovação."
      />

      {error && (
        <p className="mb-5 rounded-xl border border-amber-400/30 p-4 text-sm text-amber-100">
          Aplique a migration Business Hub no Supabase para ativar este módulo.
        </p>
      )}

      <form
        action={createMarketingItem}
        className="mb-8 grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5 md:grid-cols-2"
      >
        <h2 className="font-semibold text-paper md:col-span-2">
          Adicionar conteúdo
        </h2>

        <select name="client_id" required className={field}>
          <option value="">Cliente</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          name="title"
          required
          placeholder="Título da publicação"
          className={field}
        />

        <select name="platform" className={field}>
          {["Instagram", "TikTok", "Facebook", "YouTube", "LinkedIn"].map(
            (x) => (
              <option key={x} value={x}>
                {x}
              </option>
            )
          )}
        </select>

        <select name="content_type" className={field}>
          {[
            "Reels",
            "Stories",
            "Carrossel",
            "Imagem",
            "Vídeo",
            "Artigo",
            "Campanha",
          ].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>

        <label className="text-xs text-mist">
          Data e hora
          <input
            name="scheduled_at"
            type="datetime-local"
            className={field}
          />
        </label>

        <select name="status" className={field}>
          <option value="idea">Ideia</option>
          <option value="planning">Planejamento</option>
          <option value="production">Em produção</option>
          <option value="review">Aguardando aprovação</option>
          <option value="scheduled">Agendado</option>
        </select>

        <input
          name="objective"
          placeholder="Objetivo do conteúdo"
          className={field}
        />

        <textarea
          name="caption"
          placeholder="Legenda"
          className={field}
        />

        <textarea
          name="script"
          placeholder="Roteiro e orientações"
          className={`${field} md:col-span-2`}
        />

        <button className="rounded-lg bg-[#29808D] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
          Salvar conteúdo
        </button>
      </form>

      <div className="space-y-3">
        {(items ?? []).map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold text-paper">{item.title}</p>

                <p className="text-xs text-mist">
                  {item.clients?.[0]?.name ?? "Cliente"} · {item.platform} ·{" "}
                  {item.content_type} ·{" "}
                  {item.scheduled_at
                    ? new Date(item.scheduled_at).toLocaleString("pt-BR")
                    : "Sem data"}
                </p>
              </div>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                {item.status}
              </span>
            </div>

            {item.caption && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-mist">
                {item.caption}
              </p>
            )}

            <form
              action={updateMarketingStatus}
              className="mt-3 flex flex-wrap gap-2"
            >
              <input type="hidden" name="id" value={item.id} />

              <select
                name="status"
                defaultValue={item.status}
                className={`${field} max-w-xs`}
              >
                {[
                  "idea",
                  "planning",
                  "production",
                  "review",
                  "approved",
                  "scheduled",
                  "published",
                  "changes_requested",
                  "cancelled",
                ].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>

              <button className="rounded-lg border border-white/15 px-3 py-2 text-xs text-paper">
                Atualizar status
              </button>
            </form>

            {item.client_feedback && (
              <p className="mt-2 text-xs text-amber-200">
                Retorno do cliente: {item.client_feedback}
              </p>
            )}
          </article>
        ))}

        {!items?.length && (
          <p className="text-sm text-mist">
            Nenhum conteúdo planejado.
          </p>
        )}
      </div>
    </>
  );
}
