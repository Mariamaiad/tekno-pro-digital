
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import {
  clientReview,
  clientSignOut,
  createClientRequest,
} from "@/app/admin/business-actions";
import { contractStatusLabel } from "@/lib/contracts/documents";
import { formatBRL, formatDateBR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meu portal" };

export default async function ClientPortal() {
  const supabase = await createSessionClient();

  if (!supabase) redirect("/portal/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const { data: links } = await supabase
    .from("client_users")
    .select("client_id, clients(name, segment)")
    .eq("user_id", user.id);

  if (!links?.length) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#071827] p-6 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <div className="mb-6 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white">
  <img
    src="/tekno-pro-digital.jpeg"
    alt="Tekno Pro Digital"
    className="h-full w-full object-contain"
  />
</div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#65D5D0]">
            Tekno Pro Digital
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Seu acessoestá  sendo preparado
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sua conta foi autenticada, mas ainda nÃ£oestá  vinculada ao cadastro
            da sua empresa. Nossa equipe farÃ¡ essa associaÃ§Ã£o para liberar seu
            portal.
          </p>
          <form action={clientSignOut} className="mt-8">
            <button className="rounded-xl border border-white/15 px-5 py-3 text-sm font-medium transition hover:bg-white/10">
              Sair da conta
            </button>
          </form>
        </div>
      </main>
    );
  }

  const ids = links.map((x) => x.client_id);


  const [
    { data: contracts, count: contractCount },
    { data: posts, count: postCount },
    { data: invoices, count: invoiceCount },
    { data: requests, count: requestCount },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, status, contract_number, title, plan_name, monthly_value, setup_fee, start_date, end_date, document_filename",
        { count: "exact" }
      )
      .in("client_id", ids)
      .order("created_at", { ascending: false })
      .limit(50),
  
    supabase
      .from("marketing_calendar")
      .select(
        "id, title, platform, content_type, scheduled_at, status, caption",
        { count: "exact" }
      )
      .in("client_id", ids)
      .order("scheduled_at", { ascending: true })
      .limit(50),
  
    supabase
      .from("invoices")
      .select(
        "id, description, due_date, amount, status",
        { count: "exact" }
      )
      .in("client_id", ids)
      .order("due_date", { ascending: false })
      .limit(50),
  
    supabase
      .from("client_requests")
      .select(
        "id, subject, status, message, response",
        { count: "exact" }
      )
      .in("client_id", ids)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  
  

  const companyNames = links
    .map((l) => l.clients?.[0]?.name)
    .filter(Boolean);

  return (
    <main className="min-h-dvh bg-[#F3F6F9] text-[#102C42]">
      {/* CabeÃ§alho */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#102C42] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white">
  <img
    src="/tekno-pro-digital.jpeg"
    alt="Tekno Pro Digital"
    className="h-full w-full object-contain"
  />
</div>
            <div>
              <p className="text-sm font-semibold tracking-wide">
                Tekno Pro Digital
              </p>
              <p className="text-xs text-slate-300">Area do cliente</p>
            </div>
          </div>

          <form action={clientSignOut}>
            <button className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium transition hover:border-[#65D5D0]/50 hover:bg-white/10">
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        {/* Navegações  lateral */}
        <aside className="block">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Navegações 
            </p>

            <nav className="space-y-1">
              {[
                ["Visão geral", "#inicio"],
                ["Contratos", "#contratos"],
                ["Calendário", "#calendario"],
                ["Financeiro", "#financeiro"],
                ["Solicitações", "#solicitacoes"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-[#EAF3F5] hover:text-[#1C596C]"
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="mt-6 rounded-xl bg-[#102C42] p-4 text-white">
              <p className="text-xs font-semibold text-[#65D5D0]">
                Tekno Pro Digital
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Seu espaçoo de acompanhamento e relacionamento.
              </p>
            </div>
          </div>
        </aside>

        {/* ConteÃºdo principal */}
        <div className="min-w-0 space-y-8">
          {/* Visão geral */}
          <section id="inicio">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#102C42] via-[#17465D] to-[#1C596C] p-6 text-white shadow-xl sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#65D5D0]">
                    Bem-vindo ao seu espaçoo
                  </p>

                  <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Olá, {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0]}
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                    Acompanhe seus projetos, contratos, entregas e informações
                    da sua empresa em um Unico lugar.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <p className="text-xs text-slate-300">Sua empresa</p>
                  <p className="mt-1 text-sm font-semibold">
                    {companyNames.join(", ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Cards de resumo */}
            <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[
                {
                  label: "Contratos",
                  value: contractCount,
                  description: "Documentos disponÃ­veis",
                  color: "#1C596C",
                },
                {
                  label: "Conteúdos",
                  value: postCount,
                  description: "Itens no Calendário",
                  color: "#29808D",
                },
                {
                  label: "Cobranças",
                  value: invoiceCount,
                  description: "Registros financeiros",
                  color: "#B7791F",
                },
                {
                  label: "Solicitações",
                  value: requestCount,
                  description: "Histórico de atendimento",
                  color: "#5265A8",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">
                      {item.label}
                    </p>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>

                  <p className="mt-3 text-3xl font-semibold tracking-tight">
                    {item.value}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Contratos */}
          <section id="contratos" className="scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#29808D]">
                  Documentação
                </p>
                <h2 className="mt-1 text-xl font-semibold">Meus contratos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Consulte seus contratos e documentos disponibilizados.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                {contractCount} documento(s)
              </span>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {(contracts ?? []).map((c) => (
                <article
                  key={c.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF3F5] text-[#1C596C]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-5 w-5"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6M8 13h8M8 17h8" />
                      </svg>
                    </div>

                    <span className="rounded-full bg-[#EAF3F5] px-3 py-1 text-xs font-semibold text-[#1C596C]">
                      {contractStatusLabel(c.status)}
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    {c.contract_number}
                  </p>

                  <h3 className="mt-1 text-base font-semibold">{c.title}</h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {c.plan_name || "Plano nÃ£o informado"}
                  </p>

                  <div className="mt-5 rounded-xl bg-[#F3F6F9] p-4">
                    <p className="text-xs text-slate-500">
                      Mensalidade contratada
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[#102C42]">
                      {formatBRL(Number(c.monthly_value))}
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        /mÃªs
                      </span>
                    </p>

                    {Number(c.setup_fee) > 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        Implantação: {formatBRL(Number(c.setup_fee))}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-slate-500">
                    <p>InÃ­cio: {formatDateBR(c.start_date)}</p>
                    {c.end_date && (
                      <p>TÃ©rmino: {formatDateBR(c.end_date)}</p>
                    )}
                  </div>

                  {c.document_filename ? (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="mb-3 truncate text-xs text-slate-500">
                        Documento: {c.document_filename}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/api/contract-documents/${c.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-xl bg-[#102C42] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1C596C]"
                        >
                          Visualizar PDF
                        </a>

                        <a
                          href={`/api/contract-documents/${c.id}?download=1`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-[#1C596C] transition hover:bg-[#EAF3F5]"
                        >
                          Baixar PDF
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                      O documento ainda nÃ£o foi disponibilizado.
                    </div>
                  )}
                </article>
              ))}

              {!contracts?.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center xl:col-span-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF3F5] text-[#1C596C]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-6 w-6"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>

                  <h3 className="mt-4 text-sm font-semibold">
                    Nenhum contrato disponível
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Seus documentos aparecerão o aqui quando forem
                    disponibilizados pela equipe.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Calendário de marketing */}
          <section id="calendario" className="scroll-mt-24">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#29808D]">
                Planejamento
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Meu Calendário e Conteúdos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Acompanhe suas entregas e aprove Conteúdos diretamente pelo
                portal.
              </p>
            </div>

            <div className="space-y-4">
              {(posts ?? []).map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3F5] text-[#1C596C]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="h-5 w-5"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <path d="M8 8h8M8 12h8M8 16h4" />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold">{p.title}</h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {p.platform} Â· {p.content_type}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {p.scheduled_at
                            ? new Date(p.scheduled_at).toLocaleString(
                                "pt-BR",
                              )
                            : "Data a definir"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-[#EAF3F5] px-3 py-1.5 text-xs font-semibold text-[#1C596C]">
                      {p.status}
                    </span>
                  </div>

                  {p.caption && (
                    <div className="mt-4 rounded-xl bg-[#F3F6F9] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {p.caption}
                      </p>
                    </div>
                  )}

                  {p.status === "review" && (
                    <form
                      action={clientReview}
                      className="mt-5 rounded-xl border border-[#D5E8EA] bg-[#F7FBFC] p-4"
                    >
                      <input type="hidden" name="id" value={p.id} />

                      <p className="mb-3 text-sm font-semibold text-[#102C42]">
                        AprovaÃ§Ã£o do conteÃºdo
                      </p>

                      <textarea
                        name="feedback"
                        placeholder="ComentÃ¡rio ou ajustes solicitados..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#29808D] focus:ring-2 focus:ring-[#29808D]/10"
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          name="decision"
                          value="approved"
                          className="rounded-xl bg-[#1C596C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102C42]"
                        >
                          Aprovar conteÃºdo
                        </button>

                        <button
                          name="decision"
                          value="changes_requested"
                          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Solicitar ajustes
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              ))}

              {!posts?.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <h3 className="text-sm font-semibold">
                    Seu Calendárioestá  sendo preparado
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Quando novos Conteúdos forem cadastrados, eles aparecerão o
                    aqui.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Financeiro */}
          <section id="financeiro" className="scroll-mt-24">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#29808D]">
                Financeiro
              </p>
              <h2 className="mt-1 text-xl font-semibold">Minhas Cobranças</h2>
              <p className="mt-1 text-sm text-slate-500">
                Consulte os valores e vencimentos vinculados Ã  sua empresa.
              </p>
            </div>

            <div className="space-y-3">
              {(invoices ?? []).map((i) => (
                <article
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF5E5] text-[#B7791F]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-5 w-5"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 10h18M7 15h3" />
                      </svg>
                    </div>

                    <div>
                      <p className="text-sm font-semibold">{i.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Vencimento: {formatDateBR(i.due_date)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatBRL(Number(i.amount))}
                    </p>

                    <span className="mt-1 inline-block rounded-full bg-[#F3F6F9] px-3 py-1 text-xs font-medium text-slate-600">
                      {i.status}
                    </span>
                  </div>
                </article>
              ))}

              {!invoices?.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <h3 className="text-sm font-semibold">
                    Nenhuma cobrança cadastrada
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Suas informações financeiras estarão  disponiveis aqui.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Solicitações */}
          <section id="solicitacoes" className="scroll-mt-24">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#29808D]">
                Atendimento
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Solicitações e suporte
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Envie uma solicitações e acompanhe o Histórico do atendimento.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <form action={createClientRequest} className="grid gap-4">
                <div>
                  <label
                    htmlFor="client_id"
                    className="mb-2 block text-xs font-semibold text-slate-600"
                  >
                    Empresa
                  </label>

                  <select
                    id="client_id"
                    name="client_id"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#29808D] focus:ring-2 focus:ring-[#29808D]/10"
                  >
                    {links.map((l) => (
                      <option key={l.client_id} value={l.client_id}>
                        {l.clients?.[0]?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="mb-2 block text-xs font-semibold text-slate-600"
                  >
                    Assunto
                  </label>

                  <input
                    id="subject"
                    name="subject"
                    required
                    placeholder="Ex.: Ajuste em conteÃºdo"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#29808D] focus:ring-2 focus:ring-[#29808D]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-2 block text-xs font-semibold text-slate-600"
                  >
                    DescriÃ§Ã£o
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    placeholder="Descreva sua solicitações..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#29808D] focus:ring-2 focus:ring-[#29808D]/10"
                  />
                </div>

                <button className="w-fit rounded-xl bg-[#102C42] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1C596C]">
                  Enviar solicitações
                </button>
              </form>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-base font-semibold">
                Histórico de Solicitações
              </h3>

              <div className="space-y-3">
                {(requests ?? []).map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h4 className="text-sm font-semibold">{r.subject}</h4>

                      <span className="rounded-full bg-[#EAF3F5] px-3 py-1 text-xs font-semibold text-[#1C596C]">
                        {r.status}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {r.message}
                    </p>

                    {r.response && (
                      <div className="mt-4 rounded-xl border-l-4 border-[#29808D] bg-[#F3F6F9] p-4">
                        <p className="text-xs font-semibold text-[#1C596C]">
                          Resposta da equipe
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {r.response}
                        </p>
                      </div>
                    )}
                  </article>
                ))}

                {!requests?.length && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                    <p className="text-sm font-semibold">
                      Nenhuma solicitações registrada
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Suas Solicitações e respostas aparecerão o aqui.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* RodapÃ© */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 pb-4">
            <div>
              <p className="text-xs font-semibold text-[#102C42]">
                Tekno Pro Digital
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Seunegocio, conectado.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#1C596C] transition hover:bg-[#EAF3F5]"
            >
              Voltar ao site
            </Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
