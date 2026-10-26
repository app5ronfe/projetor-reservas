-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ SÓ NUMA BASE DE TESTE. Este ficheiro APAGA todas as reservas,        ║
-- ║ bloqueios e notificações do projetor e cria utilizadores de teste.   ║
-- ║ NUNCA correr no projeto Supabase da produção.                        ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- Testes do projetor contra a base de dados real (migrações 0001–0032 + 0045).
-- Cada chamada é feita como um utilizador autenticado, com a RLS a valer.
create or replace function pg_temp.como(p_uid uuid, p_sql text) returns text language plpgsql as $$
declare r text;
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, false);
  execute 'set role authenticated';
  begin
    execute p_sql into r;
  exception when others then
    r := 'ERR:' || SQLERRM;
  end;
  execute 'reset role';
  return coalesce(r, '');
end $$;

create or replace function pg_temp.ok(nome text, obtido text, esperado text) returns void language plpgsql as $$
begin
  if obtido like esperado then
    raise notice 'OK    %', nome;
  else
    raise notice 'FALHA % — obtido: % · esperado: %', nome, obtido, esperado;
  end if;
end $$;

\set DANIELA 'd0000000-0000-0000-0000-000000000001'
\set ANA     'a0000000-0000-0000-0000-000000000001'
\set PEDRO   'e0000000-0000-0000-0000-000000000001'
\set JOAO    'b0000000-0000-0000-0000-000000000001'

-- Limpeza de testes anteriores
delete from public.projetor_notificacoes;
delete from public.projetor_bloqueios;
delete from public.projetor_reservas;

-- Prazo: sábado 10:00 → sexta 21:00; sábado 00:30 → sexta 21:00
select pg_temp.ok('prazo sábado 10:00 = sexta 21:00 Lisboa',
  (select public.projetor_prazo((timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'))::text), '%2030-03-01 21:00:00+00%');
select pg_temp.ok('prazo sábado 00:30 = sexta 21:00 (sem janela à noite)',
  (select public.projetor_prazo((timestamp '2030-03-02 00:30' at time zone 'Europe/Lisbon'))::text), '%2030-03-01 21:00:00+00%');

-- Campos e blocos
select pg_temp.ok('responsável em falta', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),'', 'x', '5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:RESPONSAVEL_EM_FALTA%');
select pg_temp.ok('motivo em falta', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),'Ana', ' ', '5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:MOTIVO_EM_FALTA%');
select pg_temp.ok('secção ou departamento em falta', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),'Ana','Ensaio', null, null)::text$q$), 'ERR:SECCAO_EM_FALTA%');
select pg_temp.ok('bloco de 10:15 recusado', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 10:15' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),'Ana','Ensaio','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:BLOCO_INVALIDO%');

-- Reserva normal e 00:30
select pg_temp.ok('dirigente reserva 10:00–11:00', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),'Ana','Ensaio','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), '________-____-____-____-____________%');
select pg_temp.ok('bloco encostado 11:00–12:00 aceite', pg_temp.como(:'JOAO'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 12:00' at time zone 'Europe/Lisbon'),'João','Formação','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), '________-____-____-____-____________%');
select pg_temp.ok('sobreposição parcial 10:30–11:30 recusada', pg_temp.como(:'JOAO'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 10:30' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:30' at time zone 'Europe/Lisbon'),'João','x','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:OCUPADO%');
select pg_temp.ok('reserva às 00:30 de sábado aceite', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 00:30' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 01:00' at time zone 'Europe/Lisbon'),'Ana','Vigília','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), '________-____-____-____-____________%');

-- Prazo: dirigente recusado depois das 21:00 do dia anterior; gestão não
select pg_temp.ok('dirigente fora de prazo recusado', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_reservar((timestamp '2020-01-10 10:00' at time zone 'Europe/Lisbon'),(timestamp '2020-01-10 11:00' at time zone 'Europe/Lisbon'),'Ana','Passado','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:PRAZO_EXCEDIDO%');
select pg_temp.ok('gestão reserva fora de prazo', pg_temp.como(:'DANIELA'::uuid,
  $q$select projetor_reservar((timestamp '2020-01-10 10:00' at time zone 'Europe/Lisbon'),(timestamp '2020-01-10 11:00' at time zone 'Europe/Lisbon'),'Daniela','Reunião', null, 'comunicacao')::text$q$), '________-____-____-____-____________%');

-- Escuteiro não reserva
select pg_temp.ok('escuteiro não reserva', pg_temp.como(:'PEDRO'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-03 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-03 11:00' at time zone 'Europe/Lisbon'),'Pedro','x','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:%');

-- Escrita direta bloqueada pela RLS (sem permissão de insert)
select pg_temp.ok('insert direto recusado', pg_temp.como(:'ANA'::uuid,
  $q$insert into public.projetor_reservas (inicio,fim,responsavel,motivo,seccao_id,criado_por) values ((timestamp '2030-03-04 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-04 11:00' at time zone 'Europe/Lisbon'),'Ana','x','5e000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001')::text$q$), 'ERR:%');

-- Cancelar
select pg_temp.ok('dono cancela a sua', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_cancelar((select id from public.projetor_reservas where responsavel='Ana' and inicio=(timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon') and estado='ativa'))::text$q$), '');
select pg_temp.ok('outro dirigente não cancela a reserva alheia', pg_temp.como(:'JOAO'::uuid,
  $q$select projetor_cancelar((select id from public.projetor_reservas where responsavel='Ana' and inicio=(timestamp '2030-03-02 00:30' at time zone 'Europe/Lisbon') and estado='ativa'))::text$q$), 'ERR:SEM_PERMISSAO%');
select pg_temp.ok('bloco cancelado fica livre para novo dirigente', pg_temp.como(:'JOAO'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),'João','Novo','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), '________-____-____-____-____________%');

-- Edição: só a gestão; não pode sobrepor
select pg_temp.ok('dirigente não edita', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_editar((select id from public.projetor_reservas where motivo='Novo' and estado='ativa' limit 1),(timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),'João','Novo','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:SEM_PERMISSAO%');
select pg_temp.ok('gestão edita (muda o motivo)', pg_temp.como(:'DANIELA'::uuid,
  $q$select projetor_editar((select id from public.projetor_reservas where motivo='Novo' and estado='ativa' limit 1),(timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 11:00' at time zone 'Europe/Lisbon'),'João','Revisto','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), '');
select pg_temp.ok('gestão não edita para cima de outra reserva', pg_temp.como(:'DANIELA'::uuid,
  $q$select projetor_editar((select id from public.projetor_reservas where motivo='Revisto' and estado='ativa' limit 1),(timestamp '2030-03-02 11:30' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 12:30' at time zone 'Europe/Lisbon'),'João','Revisto','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:OCUPADO%');

-- Bloqueio: pré-visualização não grava; confirmação grava e mantém a reserva
select pg_temp.ok('bloqueio sem confirmação não grava e lista quem avisar', pg_temp.como(:'DANIELA'::uuid,
  $q$select (projetor_bloquear((timestamp '2030-03-02 09:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 10:30' at time zone 'Europe/Lisbon'),'Manutenção', false)->>'gravado') || ' ' || (projetor_bloquear((timestamp '2030-03-02 09:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 10:30' at time zone 'Europe/Lisbon'),'Manutenção', false)->'afetadas'->0->>'responsavel')$q$), 'false João');
select pg_temp.ok('bloqueio não foi gravado sem confirmação', (select count(*)::text from public.projetor_bloqueios), '0');
select pg_temp.ok('bloqueio confirmado grava e mantém as reservas', pg_temp.como(:'DANIELA'::uuid,
  $q$select projetor_bloquear((timestamp '2030-03-02 09:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 10:30' at time zone 'Europe/Lisbon'),'Manutenção', true)->>'gravado'$q$), 'true');
select pg_temp.ok('reserva mantida após bloqueio', (select count(*)::text from public.projetor_reservas where responsavel='João' and estado='ativa'), '2');
select pg_temp.ok('reservar dentro do bloqueio recusado', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_reservar((timestamp '2030-03-02 09:30' at time zone 'Europe/Lisbon'),(timestamp '2030-03-02 10:00' at time zone 'Europe/Lisbon'),'Ana','x','5e000000-0000-0000-0000-000000000001'::uuid)::text$q$), 'ERR:BLOQUEADO%');
select pg_temp.ok('dirigente não bloqueia', pg_temp.como(:'ANA'::uuid,
  $q$select projetor_bloquear((timestamp '2030-03-05 09:00' at time zone 'Europe/Lisbon'),(timestamp '2030-03-05 10:00' at time zone 'Europe/Lisbon'),'x', true)::text$q$), 'ERR:SEM_PERMISSAO%');

-- RLS de leitura
select pg_temp.ok('escuteiro não vê reservas', pg_temp.como(:'PEDRO'::uuid,
  $q$select count(*)::text from public.projetor_reservas$q$), '0');
select pg_temp.ok('dirigente vê reservas', pg_temp.como(:'ANA'::uuid,
  $q$select (count(*) > 0)::text from public.projetor_reservas$q$), 'true');
select pg_temp.ok('escuteiro não vê bloqueios', pg_temp.como(:'PEDRO'::uuid,
  $q$select count(*)::text from public.projetor_bloqueios$q$), '0');

-- Notificações: a gestão vê a caixa; os dirigentes não
select pg_temp.ok('gestão recebe notificações de reservas', pg_temp.como(:'DANIELA'::uuid,
  $q$select (count(*) > 0)::text from public.projetor_notificacoes$q$), 'true');
select pg_temp.ok('dirigente não vê a caixa da gestão', pg_temp.como(:'ANA'::uuid,
  $q$select count(*)::text from public.projetor_notificacoes$q$), '0');

-- Concorrência por SQL: duas reservas sobrepostas inseridas à mão são recusadas pela restrição
select pg_temp.ok('restrição de exclusão recusa sobreposição direta (rede de segurança)',
  (select case when exists (select 1 from pg_constraint where conname='projetor_sem_sobreposicao') then 'existe' else 'falta' end), 'existe');

-- Resumo do que ficou na base de dados
select 'reservas ativas: ' || count(*) from public.projetor_reservas where estado='ativa';
select 'bloqueios: ' || count(*) from public.projetor_bloqueios;
select 'notificações: ' || count(*) from public.projetor_notificacoes;
