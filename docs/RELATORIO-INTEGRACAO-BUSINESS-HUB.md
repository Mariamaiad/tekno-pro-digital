# Relatório de integração — Business Hub

## O que foi integrado nesta entrega

- Mantido o site institucional, autenticação administrativa e editor do site existentes.
- Menu administrativo ampliado com Clientes/CRM, Contratos, Calendário de marketing, Financeiro, Solicitações, Relatórios e acesso ao Portal.
- Cadastro e listagem de contratos associados aos registros existentes em `public.clients`.
- Cadastro e acompanhamento de conteúdos por cliente, plataforma, formato, data e status.
- Portal autenticado do cliente com consulta a contratos, conteúdos, cobranças e solicitações.
- Aprovação ou pedido de ajustes do conteúdo pelo cliente por função SQL validada no vínculo do usuário.
- Lançamentos de receitas/despesas, cobranças e atualização manual de status.
- Relatórios operacionais iniciais e estimativa de receita recorrente com base nos clientes ativos.
- Migration incremental com RLS e vínculo `client_users`, sem substituir tabelas existentes.

## O que ainda não deve ser considerado pronto para produção

1. A instalação de dependências e o build não puderam ser concluídos neste ambiente; `npm ci` excedeu o tempo disponível e o `typecheck` falhou porque a instalação ficou incompleta. Portanto, executar `npm ci`, `npm run typecheck`, `npm run lint` e `npm run build` localmente antes de publicar.
2. A migration `20261101000001_business_hub.sql` ainda não foi executada no Supabase.
3. Cada usuário cliente precisa ser criado no Supabase Auth e associado a um registro `public.clients` por `public.client_users`.
4. Upload privado de documentos/mídia do cliente, assinatura eletrônica, gateway de pagamentos, emissão automática de cobranças e publicação automática em redes sociais não foram implementados.
5. O calendário apresenta os conteúdos em lista ordenada por data; uma grade mensal/semanal interativa e arrastar/soltar ainda precisam ser desenvolvidos.
6. O cadastro de contratos e conteúdos está implementado; edição completa de todos os campos e exclusão com auditoria ainda precisam ser ampliadas.
7. Relatórios de churn, retenção, LTV e frequência histórica exigem um histórico de eventos/pagamentos confiável e ainda não estão calculados.
8. Testar RLS com pelo menos dois usuários clientes distintos e confirmar que nenhum deles consegue consultar registros do outro.

## Ordem segura para ativação

1. Faça backup do Supabase.
2. Rode a migration `supabase/migrations/20261101000001_business_hub.sql` no SQL Editor.
3. Crie um usuário cliente no Authentication → Users.
4. Associe esse usuário a um cliente existente com a instrução do README.
5. Rode os testes locais e corrija qualquer erro antes de fazer push.
6. Publique primeiro em branch de homologação, não diretamente em produção.
7. Teste o painel administrativo, editor público, portal e isolamento entre clientes.

## Rotas

- `/admin/contratos`
- `/admin/marketing`
- `/admin/financeiro`
- `/admin/solicitacoes`
- `/admin/relatorios`
- `/portal/login`
- `/portal`
