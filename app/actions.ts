'use server';

import { redirect } from 'next/navigation';
import { clienteServidor } from '../lib/supabase/servidor';
import { traduzirErro } from '../lib/projetor';
import { instante, diaAtual } from '../lib/tempo';

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/** Volta à página com uma mensagem de sucesso ou erro (lida pela própria página). */
function voltar(caminho: string, msg: { ok?: string; erro?: string }): never {
  const sep = caminho.includes('?') ? '&' : '?';
  const q = msg.ok ? `ok=${encodeURIComponent(msg.ok)}` : `erro=${encodeURIComponent(msg.erro ?? '')}`;
  redirect(`${caminho}${sep}${q}`);
}

function dados(f: FormData) {
  // «fna» e «outro» chegam na lista de departamentos mas são entidades da reserva.
  const dep = txt(f, 'departamento');
  const entidade = dep === 'fna' || dep === 'outro' ? dep : null;
  return {
    p_responsavel: txt(f, 'responsavel'),
    p_motivo: txt(f, 'motivo'),
    p_seccao: txt(f, 'seccao') || null,
    p_departamento: entidade ? null : dep || null,
    p_entidade: entidade,
    p_descricao: entidade === 'outro' ? txt(f, 'descricao') : null,
  };
}

export async function entrarAcao(f: FormData) {
  const { emailDoCodigo, passwordDoCodigo, normalizarCodigo } = await import('../lib/autenticar');
  const codigo = txt(f, 'codigo');
  if (!codigo) redirect('/login?erro=1');
  const sb = await clienteServidor();
  const { error } = await sb.auth.signInWithPassword({
    email: emailDoCodigo(codigo),
    password: passwordDoCodigo(codigo),
  });
  if (error) {
    console.error(`[projetor login] falhou para "${normalizarCodigo(codigo)}": ${error.status ?? '?'} ${error.message}`);
    redirect('/login?erro=1');
  }
  redirect('/reservas');
}

export async function sairAcao() {
  const sb = await clienteServidor();
  await sb.auth.signOut();
  redirect('/login');
}

export async function reservarAcao(f: FormData) {
  const dia = txt(f, 'dia');
  const destino = `/reservar?dia=${dia}`;
  const sb = await clienteServidor();
  const { error } = await sb.rpc('projetor_reservar', {
    p_inicio: instante(dia, txt(f, 'inicio')).toISOString(),
    p_fim: instante(dia, txt(f, 'fim')).toISOString(),
    ...dados(f),
  });
  if (error) voltar(destino, { erro: traduzirErro(error.message).mensagem });
  voltar(`/reservas?dia=${dia}`, { ok: 'Reserva criada. A secretaria foi avisada.' });
}

export async function cancelarAcao(f: FormData) {
  const dia = txt(f, 'dia') || diaAtual();
  if (txt(f, 'avisei') !== 'sim') voltar(`/reservas?dia=${dia}`, { erro: 'Antes de cancelar, avise a Chefe Daniela.' });
  const sb = await clienteServidor();
  const { error } = await sb.rpc('projetor_cancelar', { p_id: txt(f, 'id') });
  const destino = txt(f, 'destino') === 'gestao' ? '/reservas?vista=gestao' : `/secretaria?dia=${dia}`;
  if (error) voltar(destino, { erro: traduzirErro(error.message).mensagem });
  voltar(destino, { ok: 'Reserva cancelada. A secretaria foi avisada.' });
}

export async function editarAcao(f: FormData) {
  const dia = txt(f, 'dia');
  const sb = await clienteServidor();
  const { error } = await sb.rpc('projetor_editar', {
    p_id: txt(f, 'id'),
    p_inicio: instante(dia, txt(f, 'inicio')).toISOString(),
    p_fim: instante(dia, txt(f, 'fim')).toISOString(),
    ...dados(f),
  });
  const destino = txt(f, 'destino') === 'gestao' ? '/reservas?vista=gestao' : `/secretaria?dia=${dia}`;
  if (error) voltar(destino, { erro: traduzirErro(error.message).mensagem });
  voltar(destino, { ok: 'Reserva atualizada.' });
}

/** Passo 1 do bloqueio: a base de dados devolve quem seria afetado, sem gravar. */
export async function prepararBloqueioAcao(f: FormData) {
  const dia = txt(f, 'dia');
  const ini = txt(f, 'inicio');
  const fim = txt(f, 'fim');
  const motivo = txt(f, 'motivo');
  const sb = await clienteServidor();
  const { data, error } = await sb.rpc('projetor_bloquear', {
    p_inicio: instante(dia, ini).toISOString(),
    p_fim: instante(dia, fim).toISOString(),
    p_motivo: motivo,
    p_confirmar: false,
  });
  if (error) voltar(`/secretaria?dia=${dia}`, { erro: traduzirErro(error.message).mensagem });
  const afetadas = (data as { afetadas: unknown[] }).afetadas;
  if (afetadas.length === 0) {
    const { error: e2 } = await sb.rpc('projetor_bloquear', {
      p_inicio: instante(dia, ini).toISOString(), p_fim: instante(dia, fim).toISOString(),
      p_motivo: motivo, p_confirmar: true,
    });
    if (e2) voltar(`/secretaria?dia=${dia}`, { erro: traduzirErro(e2.message).mensagem });
    voltar(`/secretaria?dia=${dia}`, { ok: 'Horário bloqueado.' });
  }
  const q = new URLSearchParams({ dia, bi: ini, bf: fim, bm: motivo, confirmar: '1' });
  redirect(`/secretaria?${q.toString()}`);
}

/** Passo 2: confirmado. Grava o bloqueio e mantém as reservas; a app mostra quem avisar. */
export async function confirmarBloqueioAcao(f: FormData) {
  const dia = txt(f, 'dia');
  const sb = await clienteServidor();
  const { data, error } = await sb.rpc('projetor_bloquear', {
    p_inicio: instante(dia, txt(f, 'inicio')).toISOString(),
    p_fim: instante(dia, txt(f, 'fim')).toISOString(),
    p_motivo: txt(f, 'motivo'),
    p_confirmar: true,
  });
  if (error) voltar(`/secretaria?dia=${dia}`, { erro: traduzirErro(error.message).mensagem });
  const afetadas = (data as { afetadas: { responsavel: string }[] }).afetadas;
  const avisar = afetadas.map((a) => a.responsavel).join(', ');
  voltar(`/secretaria?dia=${dia}`, { ok: 'Horário bloqueado.' + (avisar ? ` Avise: ${avisar}.` : '') });
}
