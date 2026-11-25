// Verifica as migrações, o seed e as políticas de RLS num Postgres embutido (PGlite),
// simulando os esquemas `auth` e `storage` do Supabase. Uso: npm run db:verify
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
};

// --- Simulação mínima do ambiente Supabase ---
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(),
    bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
`);

const migDir = join(root, "supabase/migrations");
for (const f of readdirSync(migDir).sort()) {
  await db.exec(readFileSync(join(migDir, f), "utf8"));
  ok(true, `migração aplicada: ${f}`);
}
await db.exec(`
  grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
`);
await db.exec(readFileSync(join(root, "supabase/seed.sql"), "utf8"));
ok(true, "seed aplicado");

const count = async (sql) => Number((await db.query(sql)).rows[0].c);

// --- Conteúdo inicial ---
ok((await count("select count(*) c from services where category='marketing'")) === 9, "9 serviços de marketing");
ok((await count("select count(*) c from marketing_plans")) === 3, "3 planos de marketing");
const prices = (await db.query("select price from marketing_plans order by sort_order")).rows.map((r) => Number(r.price));
ok(JSON.stringify(prices) === "[697,1097,1697]", `preços dos planos ${prices.join(", ")}`);
ok((await count("select count(*) c from web_pricing")) === 5, "5 itens de preço web");
ok((await count("select count(*) c from portfolio_projects where slug='ambrozio-car' and status='draft'")) === 1, "Ambrozio Car começa como rascunho");

// --- Usuários de teste ---
const ADMIN = "11111111-1111-1111-1111-111111111111";
const USER = "22222222-2222-2222-2222-222222222222";
await db.exec(`insert into auth.users values ('${ADMIN}', 'maria@teste'), ('${USER}', 'outro@teste');
  insert into admins (user_id, email) values ('${ADMIN}', 'maria@teste');`);

const as = async (role, sub, fn) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.sub', '${sub ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
};
const tryExec = async (sql) => {
  try {
    const r = await db.query(sql);
    return { ok: true, affected: r.affectedRows ?? 0 };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

// Visitante anônimo
await as("anon", null, async () => {
  ok((await count("select count(*) c from portfolio_projects")) === 0, "visitante não vê rascunhos do portfólio");
  ok((await count("select count(*) c from marketing_plans")) === 3, "visitante vê planos ativos");
  ok((await count("select count(*) c from leads")) === 0, "visitante não lê leads");
  const ins = await tryExec("insert into leads (name, message) values ('Spam', 'mensagem qualquer')");
  ok(!ins.ok, "visitante não insere leads diretamente");
  const upd = await tryExec("update marketing_plans set price = 1");
  ok(!upd.ok || upd.affected === 0, "visitante não altera preços");
  const st = await tryExec("insert into storage.objects (bucket_id, name) values ('site-media', 'x.jpg')");
  ok(!st.ok, "visitante não envia arquivos");
});

// Usuário autenticado que NÃO é admin
await as("authenticated", USER, async () => {
  const upd = await tryExec("update marketing_plans set price = 1");
  ok(!upd.ok || upd.affected === 0, "usuário comum não altera preços");
  const ins = await tryExec("insert into services (category, title) values ('web', 'Invasor')");
  ok(!ins.ok, "usuário comum não cria serviços");
  const st = await tryExec("insert into storage.objects (bucket_id, name) values ('site-media', 'x.jpg')");
  ok(!st.ok, "usuário comum não envia arquivos");
});

// Admin
await as("authenticated", ADMIN, async () => {
  ok((await count("select count(*) c from portfolio_projects")) === 1, "admin vê rascunhos");
  const upd = await tryExec("update marketing_plans set price = 749 where name = 'Plano Essencial'");
  ok(upd.ok && upd.affected === 1, "admin altera preço");
  const st = await tryExec("insert into storage.objects (bucket_id, name) values ('site-media', 'admin.jpg')");
  ok(st.ok, "admin envia arquivos");
  const pub = await tryExec("update portfolio_projects set status = 'published' where slug = 'ambrozio-car'");
  ok(pub.ok && pub.affected === 1, "admin publica projeto");
});
ok((await count("select count(*) c from portfolio_projects where published_at is not null")) === 1, "data de publicação preenchida");

// Clientes (dados internos)
await as("authenticated", ADMIN, async () => {
  const c = await tryExec("insert into clients (name, status, monthly_value) values ('Cliente Teste', 'active', 697)");
  ok(c.ok, "admin cadastra cliente");
  const t = await tryExec("insert into client_tasks (client_id, title, done) select id, 'Tarefa', true from clients limit 1");
  ok(t.ok, "admin cria tarefa do cliente");
  const a = await tryExec("insert into client_activities (client_id, content) select id, 'Reunião inicial' from clients limit 1");
  ok(a.ok, "admin registra atendimento");
});
ok((await count("select count(*) c from client_tasks where done and done_at is not null")) === 1, "data de conclusão da tarefa preenchida");
await as("anon", null, async () => {
  ok((await count("select count(*) c from clients")) === 0, "visitante não vê clientes");
  ok((await count("select count(*) c from client_activities")) === 0, "visitante não vê histórico de clientes");
  const ins = await tryExec("insert into clients (name) values ('Invasor')");
  ok(!ins.ok, "visitante não cadastra clientes");
});
await as("authenticated", USER, async () => {
  ok((await count("select count(*) c from clients")) === 0, "usuário comum não vê clientes");
  ok((await count("select count(*) c from client_tasks")) === 0, "usuário comum não vê tarefas de clientes");
});
const badStatus = await tryExec("insert into clients (name, status) values ('X', 'qualquer')");
ok(!badStatus.ok, "situação inválida do cliente é rejeitada");
await db.exec("delete from clients");
ok((await count("select count(*) c from client_tasks")) === 0, "excluir cliente apaga as tarefas");

// Texto do topo
const heroTitle = (await db.query("select data #>> '{hero,title}' t from site_settings where id = 1")).rows[0].t;
ok(heroTitle === "Marketing e tecnologia potencializando o crescimento.", "novo título do topo no seed");

// Restrições de integridade
const bad = await tryExec("insert into marketing_plans (name, contents_count, videos_count) values ('X', 4, 8)");
ok(!bad.ok, "vídeos não podem exceder o total de conteúdos");
const badRange = await tryExec("insert into web_pricing (name, price_min, price_max) values ('X', 500, 100)");
ok(!badRange.ok, "faixa de preço inválida é rejeitada");

// Business Hub: documentos contratuais (bucket privado + RLS)
const CLIENT_USER = "33333333-3333-3333-3333-333333333333";
const OTHER_USER = "44444444-4444-4444-4444-444444444444";
const CLIENT_A = "55555555-5555-5555-5555-555555555555";
const CLIENT_B = "66666666-6666-6666-6666-666666666666";
const CONTRACT_A = "77777777-7777-7777-7777-777777777777";
const CONTRACT_B = "88888888-8888-8888-8888-888888888888";
await db.exec(`
  insert into auth.users values ('${CLIENT_USER}', 'cliente@teste'), ('${OTHER_USER}', 'outro-cliente@teste');
  insert into clients (id, name, status) values ('${CLIENT_A}', 'Empresa A', 'active'), ('${CLIENT_B}', 'Empresa B', 'active');
  insert into client_users (user_id, client_id) values ('${CLIENT_USER}', '${CLIENT_A}');
  insert into contracts (id, client_id, contract_number, title, start_date, document_path, document_filename)
    values
    ('${CONTRACT_A}', '${CLIENT_A}', 'CT-A', 'Contrato A', '2026-01-01', '${CLIENT_A}/${CONTRACT_A}/a.pdf', 'contrato-a.pdf'),
    ('${CONTRACT_B}', '${CLIENT_B}', 'CT-B', 'Contrato B', '2026-01-01', '${CLIENT_B}/${CONTRACT_B}/b.pdf', 'contrato-b.pdf');
  insert into storage.objects (bucket_id, name) values
    ('contract-documents', '${CLIENT_A}/${CONTRACT_A}/a.pdf'),
    ('contract-documents', '${CLIENT_B}/${CONTRACT_B}/b.pdf');
`);
ok((await count("select count(*) c from storage.buckets where id='contract-documents' and public is false")) === 1, "bucket de contratos é privado");
await as("anon", null, async () => {
  ok((await count("select count(*) c from contracts")) === 0, "visitante não lê contratos");
  ok((await count("select count(*) c from storage.objects where bucket_id='contract-documents'")) === 0, "visitante não lê PDFs de contratos");
  const ins = await tryExec(`insert into storage.objects (bucket_id, name) values ('contract-documents', '${CLIENT_A}/${CONTRACT_A}/x.pdf')`);
  ok(!ins.ok, "visitante não envia PDF de contrato");
});
await as("authenticated", CLIENT_USER, async () => {
  ok((await count(`select count(*) c from contracts where id='${CONTRACT_A}'`)) === 1, "cliente lê contrato da própria empresa");
  ok((await count(`select count(*) c from contracts where id='${CONTRACT_B}'`)) === 0, "cliente não lê contrato de outra empresa");
  ok((await count(`select count(*) c from storage.objects where name='${CLIENT_A}/${CONTRACT_A}/a.pdf'`)) === 1, "cliente lê PDF da própria empresa");
  ok((await count(`select count(*) c from storage.objects where name='${CLIENT_B}/${CONTRACT_B}/b.pdf'`)) === 0, "cliente não lê PDF de outra empresa");
  const ins = await tryExec(`insert into storage.objects (bucket_id, name) values ('contract-documents', '${CLIENT_A}/${CONTRACT_A}/hack.pdf')`);
  ok(!ins.ok, "cliente não envia PDF de contrato");
});
await as("authenticated", ADMIN, async () => {
  ok((await count("select count(*) c from contracts")) === 2, "admin lê todos os contratos");
  const ins = await tryExec(`insert into storage.objects (bucket_id, name) values ('contract-documents', '${CLIENT_A}/${CONTRACT_A}/admin.pdf')`);
  ok(ins.ok, "admin envia PDF de contrato");
});

console.log(failures ? `\n${failures} verificação(ões) falharam.` : "\nTodas as verificações passaram.");
process.exit(failures ? 1 : 0);
