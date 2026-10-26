import Link from 'next/link';
import type { Reserva } from '../lib/projetor';
import { ENTIDADES } from '../lib/projetor';
import { editarAcao, cancelarAcao } from '../app/actions';
import { formatarInstante, horaDe, limitesDia } from '../lib/tempo';
import { diaLisboa } from '../lib/calendario';

type Opcao = { id: string; nome: string };

export function ControloGestao({
  reservas, seccoes, deptos, filtro, de, ate, hoje,
}: {
  reservas: Reserva[]; seccoes: Opcao[]; deptos: Opcao[]; filtro: string; de: string; ate: string; hoje: string;
}) {
  const [tipo, valor] = filtro.includes('|') ? filtro.split('|') : ['', ''];
  const lista = reservas.filter((r) => {
    if (tipo === 'seccao') return r.seccao === valor;
    if (tipo === 'departamento') return r.departamento === valor;
    if (tipo === 'entidade') return r.entidade === valor;
    return true;
  });
  return (
    <>
      <div className="acoes-gestao">
        <details className="mais">
          <summary className="btn">+ Novo</summary>
          <div className="mais-lista">
            <Link href={`/reservar?dia=${hoje}`}>Agendar reserva</Link>
            <Link href={`/secretaria?dia=${hoje}`}>Bloquear horário</Link>
          </div>
        </details>
      </div>

      <form method="get" className="cartao filtro">
        <input type="hidden" name="vista" value="gestao" />
        <label htmlFor="f">Filtrar por</label>
        <select id="f" name="f" defaultValue={filtro}>
          <option value="">Todas as reservas</option>
          <optgroup label="Secções">
            {seccoes.map((s) => <option key={s.id} value={`seccao|${s.nome}`}>{s.nome}</option>)}
          </optgroup>
          <optgroup label="Departamentos">
            {deptos.map((d) => <option key={d.id} value={`departamento|${d.id}`}>{d.nome}</option>)}
          </optgroup>
          <optgroup label="Entidades">
            {ENTIDADES.map((e) => <option key={e.id} value={`entidade|${e.id}`}>{e.nome}</option>)}
          </optgroup>
        </select>
        <div className="linha">
          <div><label htmlFor="de">De</label><input id="de" name="de" type="date" defaultValue={de} /></div>
          <div><label htmlFor="ate">Até</label><input id="ate" name="ate" type="date" defaultValue={ate} /></div>
        </div>
        <button type="submit" className="btn secundario">Aplicar</button>
      </form>

      <h2>Reservas ({lista.length})</h2>
      <div className="cartao">
        {lista.length === 0 && <p className="pequeno" style={{ margin: 0 }}>Não há reservas com este filtro.</p>}
        <ul className="lista">
          {lista.map((r) => {
            const dia = diaLisboa(r.inicio);
            const origem = r.seccao ?? (r.departamento ? 'Departamento' : 'Sem secção');
            return (
              <li key={r.id}>
                <strong>{formatarInstante(new Date(r.inicio))} – {horaDe(new Date(r.fim))}</strong> · {r.motivo}
                <div className="pequeno">{r.responsavel} · {origem}</div>
                <details style={{ marginTop: 6 }}>
                  <summary className="pequeno">Editar</summary>
                  <form action={editarAcao}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="dia" value={dia} />
                    <input type="hidden" name="destino" value="gestao" />
                    <div className="linha">
                      <div><label>Início</label><input name="inicio" type="time" step={3600} defaultValue={horaDe(new Date(r.inicio))} required /></div>
                      <div><label>Fim</label><input name="fim" type="time" step={3600} defaultValue={horaDe(new Date(r.fim))} required /></div>
                    </div>
                    <label>Responsável</label><input name="responsavel" defaultValue={r.responsavel} required />
                    <label>Motivo</label><input name="motivo" defaultValue={r.motivo} required />
                    <label>Secção</label>
                    <select name="seccao" defaultValue={seccoes.find((s) => s.nome === r.seccao)?.id ?? ''}>
                      <option value="">—</option>
                      {seccoes.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                    <label>Departamento</label>
                    <select name="departamento" defaultValue={r.entidade ?? r.departamento ?? ''}>
                      <option value="">—</option>
                      {deptos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                      {ENTIDADES.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <label>Descrição (se «Outro»)</label>
                    <input name="descricao" defaultValue={r.descricao ?? ''} />
                    <button type="submit" className="btn">Guardar alterações</button>
                  </form>
                </details>
                <form action={cancelarAcao}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="dia" value={dia} />
                  <input type="hidden" name="avisei" value="sim" />
                  <input type="hidden" name="destino" value="gestao" />
                  <button type="submit" className="btn perigo">Remover reserva</button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

type Linha = { nome: string; n: number; horas: number };

function somar(mapa: Map<string, Linha>, nome: string, horas: number) {
  const atual = mapa.get(nome) ?? { nome, n: 0, horas: 0 };
  atual.n += 1;
  atual.horas += horas;
  mapa.set(nome, atual);
}

function Tabela({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  const total = linhas.reduce((t, l) => ({ n: t.n + l.n, horas: t.horas + l.horas }), { n: 0, horas: 0 });
  return (
    <>
      <h2>{titulo}</h2>
      <div className="cartao">
        {linhas.length === 0 ? (
          <p className="pequeno" style={{ margin: 0 }}>Sem utilizações neste período.</p>
        ) : (
          <table className="tab-est">
            <thead><tr><th>Nome</th><th className="num">Reservas</th><th className="num">Horas</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.nome}><td>{l.nome}</td><td className="num">{l.n}</td><td className="num">{l.horas.toFixed(1)}</td></tr>
              ))}
              <tr className="total"><td>Total</td><td className="num">{total.n}</td><td className="num">{total.horas.toFixed(1)}</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/** Utilizações por secção, entidade e departamento, entre duas datas (inclusive). */
export function Estatisticas({
  reservas, deptos, de, ate,
}: { reservas: Reserva[]; deptos: Opcao[]; de: string; ate: string }) {
  const inicio = limitesDia(de).inicio.getTime();
  const fim = limitesDia(ate).fim.getTime();
  const porSeccao = new Map<string, Linha>();
  const porEntidade = new Map<string, Linha>();
  const porDepto = new Map<string, Linha>();
  const nomeDepto = new Map(deptos.map((d) => [d.id, d.nome]));

  for (const r of reservas) {
    const ini = Math.max(new Date(r.inicio).getTime(), inicio);
    const fe = Math.min(new Date(r.fim).getTime(), fim);
    if (fe <= ini) continue;
    const horas = (fe - ini) / 3600000;
    if (r.seccao) somar(porSeccao, r.seccao, horas);
    else if (r.entidade === 'fna') somar(porEntidade, 'FNA', horas);
    else if (r.entidade === 'outro') somar(porEntidade, 'Outro', horas);
    else if (r.departamento) somar(porDepto, nomeDepto.get(r.departamento) ?? r.departamento, horas);
  }
  const ordenar = (m: Map<string, Linha>) => [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  return (
    <>
      <form method="get" className="cartao filtro">
        <input type="hidden" name="vista" value="estatisticas" />
        <div className="linha">
          <div><label htmlFor="de">Desde</label><input id="de" name="de" type="date" defaultValue={de} /></div>
          <div><label htmlFor="ate">Até ao dia</label><input id="ate" name="ate" type="date" defaultValue={ate} /></div>
        </div>
        <button type="submit" className="btn secundario">Atualizar</button>
      </form>
      <Tabela titulo="Secções" linhas={ordenar(porSeccao)} />
      <Tabela titulo="Entidades" linhas={ordenar(porEntidade)} />
      <Tabela titulo="Departamentos" linhas={ordenar(porDepto)} />
    </>
  );
}
