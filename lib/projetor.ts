import { clienteServidor } from './supabase/servidor';
import { MENSAGEM_PRAZO } from './regras';

/**
 * Camada de dados do projetor. Lê com a RLS (o utilizador vê o que pode ver) e
 * escreve SÓ através das funções SQL `projetor_*` (migração 0045): as regras
 * — prazo, bloqueios, concorrência — vivem na base de dados.
 */

export type Sessao = { id: string; nome: string; dirigente: boolean; gestao: boolean };
export type Seccao = { id: string; nome: string };
export type Departamento = { id: string; nome: string };
export type Reserva = {
  id: string; inicio: string; fim: string; responsavel: string; motivo: string;
  seccao: string | null; departamento: string | null; criado_por: string;
  entidade: string | null; descricao: string | null;
};

/** Opções especiais da lista «departamento»: não são departamentos, são entidades da reserva. */
export const ENTIDADES = [
  { id: 'fna', nome: 'FNA — Fraternidade do Agrupamento' },
  { id: 'outro', nome: 'Outro' },
] as const;
export type Bloqueio = { id: string; inicio: string; fim: string; motivo: string };
export type Erro = { codigo: string; mensagem: string };

const MENSAGENS: Record<string, string> = {
  OCUPADO: 'Este horário já foi reservado. Escolha outro.',
  BLOQUEADO: 'Este horário está bloqueado pela secretaria.',
  PRAZO_EXCEDIDO: MENSAGEM_PRAZO,
  SEM_PERMISSAO: 'Não tem permissão para esta ação.',
  NAO_ENCONTRADA: 'Reserva não encontrada.',
  RESPONSAVEL_EM_FALTA: 'Indique o nome do responsável pela reserva.',
  MOTIVO_EM_FALTA: 'Indique o motivo.',
  SECCAO_EM_FALTA: 'Indique a secção, o departamento ou a entidade.',
  DESCRICAO_EM_FALTA: 'Para «Outro», descreva brevemente o que é.',
  BLOCO_INVALIDO: 'As reservas são em blocos de 1 hora.',
  INTERVALO_INVALIDO: 'A hora de fim tem de ser depois da hora de início.',
};

/** Converte a mensagem do Postgres num código estável e numa frase em português. */
export function traduzirErro(mensagem: string): Erro {
  const codigo = Object.keys(MENSAGENS).find((c) => mensagem.includes(c)) ?? 'ERRO';
  return { codigo, mensagem: MENSAGENS[codigo] ?? 'Não foi possível concluir. Tente outra vez.' };
}

export async function sessaoAtual(): Promise<Sessao | null> {
  const sb = await clienteServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('users')
    .select('id, nome, role, cargo_agrupamento, ativo')
    .eq('id', user.id).maybeSingle();
  if (!data || !data.ativo) return null;
  return {
    id: data.id,
    nome: data.nome,
    dirigente: data.role === 'chefe' || data.role === 'admin',       // = e_chefe()
    gestao: Boolean(data.cargo_agrupamento) || data.role === 'admin', // = e_gestor_agrupamento()
  };
}

export async function seccoes(): Promise<Seccao[]> {
  const sb = await clienteServidor();
  const { data } = await sb.from('seccoes').select('id, nome').eq('ativa', true).order('ordem');
  return (data ?? []) as Seccao[];
}

export async function departamentos(): Promise<Departamento[]> {
  const sb = await clienteServidor();
  const { data } = await sb.from('departamentos').select('id, nome').order('ordem');
  return (data ?? []) as Departamento[];
}

type LinhaReserva = {
  id: string; inicio: string; fim: string; responsavel: string; motivo: string;
  departamento_id: string | null; criado_por: string;
  seccao: { nome: string } | null;
  entidade: string | null; descricao: string | null;
};

/** Nome a mostrar para quem reservou quando não é secção nem departamento. */
function origemLinha(r: LinhaReserva): string | null {
  if (r.seccao?.nome) return r.seccao.nome;
  if (r.entidade === 'fna') return 'FNA';
  if (r.entidade === 'outro') return `Outro: ${r.descricao ?? ''}`;
  return null;
}

export async function reservasEntre(inicio: Date, fim: Date): Promise<Reserva[]> {
  const sb = await clienteServidor();
  const { data, error } = await sb.from('projetor_reservas')
    .select('id, inicio, fim, responsavel, motivo, departamento_id, criado_por, entidade, descricao, seccao:seccoes(nome)')
    .eq('estado', 'ativa')
    .lt('inicio', fim.toISOString()).gt('fim', inicio.toISOString())
    .order('inicio');
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LinhaReserva[]).map((r) => ({
    id: r.id, inicio: r.inicio, fim: r.fim, responsavel: r.responsavel, motivo: r.motivo,
    seccao: origemLinha(r), departamento: r.departamento_id, criado_por: r.criado_por,
    entidade: r.entidade, descricao: r.descricao,
  }));
}

export async function bloqueiosEntre(inicio: Date, fim: Date): Promise<Bloqueio[]> {
  const sb = await clienteServidor();
  const { data } = await sb.from('projetor_bloqueios')
    .select('id, inicio, fim, motivo')
    .lt('inicio', fim.toISOString()).gt('fim', inicio.toISOString());
  return (data ?? []) as Bloqueio[];
}

export async function minhasReservas(userId: string): Promise<Reserva[]> {
  const sb = await clienteServidor();
  const { data } = await sb.from('projetor_reservas')
    .select('id, inicio, fim, responsavel, motivo, departamento_id, criado_por, entidade, descricao, seccao:seccoes(nome)')
    .eq('estado', 'ativa').eq('criado_por', userId)
    .gt('fim', new Date().toISOString()).order('inicio');
  return ((data ?? []) as unknown as LinhaReserva[]).map((r) => ({
    id: r.id, inicio: r.inicio, fim: r.fim, responsavel: r.responsavel, motivo: r.motivo,
    seccao: origemLinha(r), departamento: r.departamento_id, criado_por: r.criado_por,
    entidade: r.entidade, descricao: r.descricao,
  }));
}

export async function caixaDaGestao() {
  const sb = await clienteServidor();
  const { data } = await sb.from('projetor_notificacoes')
    .select('id, texto, criado_em').order('criado_em', { ascending: false }).limit(30);
  return (data ?? []) as { id: string; texto: string; criado_em: string }[];
}

/** Pré-visualização do bloqueio: a base de dados diz quem seria afetado, sem gravar nada. */
export async function previsaoBloqueio(inicio: Date, fim: Date, motivo: string) {
  const sb = await clienteServidor();
  const { data, error } = await sb.rpc('projetor_bloquear', {
    p_inicio: inicio.toISOString(), p_fim: fim.toISOString(), p_motivo: motivo, p_confirmar: false,
  });
  if (error) return [];
  return ((data as { afetadas: { id: string; responsavel: string; motivo: string; inicio: string; fim: string }[] }).afetadas) ?? [];
}
