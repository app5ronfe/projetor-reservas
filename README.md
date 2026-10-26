# Secretaria 5 Ronfe — reservas do projetor

App (PWA para iPhone) da secretaria para reservar o projetor. Usa **a mesma base de dados Supabase**
da app do agrupamento: o mesmo login por código, os mesmos utilizadores, secções e departamentos.

## Onde está cada coisa
- **Esquema, regras e concorrência:** `supabase/migrations/0045_projetor_reservas.sql` na app do agrupamento
  (tabelas, RLS e funções `projetor_reservar`, `projetor_cancelar`, `projetor_editar`, `projetor_bloquear`).
  A app só escreve através destas funções.
- **Testes da base de dados:** `testes/projetor.sql` (32 verificações, incluindo prazo, bloqueios e RLS).
- **Regras puras (prazo, blocos, fuso de Lisboa):** `lib/regras.ts`, com testes em `lib/regras.test.ts`.

## Correr
    npm install
    cp .env.example .env.local     # preencher com os valores do projeto Supabase (nunca no repositório)
    npm run dev                    # entrar com o código de acesso, como na app do agrupamento

## Testar
    npm test                       # regras puras
    DATABASE_URL=... npm run test:bd   # base de dados (com a migração 0045 aplicada)

## Por fazer
- Notificações push no iPhone: chaves VAPID na Vercel; envio no servidor para a secretária.
- Recorrência de bloqueios (fase 2).
- Ícone próprio da secretaria.
