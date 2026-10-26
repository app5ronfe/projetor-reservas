import Link from 'next/link';
import { blocosDoDia, horaDe, diaVizinho, rotuloDia } from '../lib/tempo';
import { sobrepoe } from '../lib/regras';
import type { Reserva, Bloqueio } from '../lib/projetor';

export function NavDia({ dia, base, extra = '' }: { dia: string; base: string; extra?: string }) {
  return (
    <div className="dia-nav">
      <Link href={`${base}?dia=${diaVizinho(dia, -1)}${extra}`}>← Anterior</Link>
      <strong>{rotuloDia(dia)}</strong>
      <Link href={`${base}?dia=${diaVizinho(dia, 1)}${extra}`}>Seguinte →</Link>
    </div>
  );
}

type Props = {
  dia: string;
  reservas: Reserva[];
  bloqueios: Bloqueio[];
  /** Dirigentes: bloco livre leva a «Reservar». Secretaria: só leitura. */
  comReservar: boolean;
  seccaoFiltro?: string;
};

export default function GradeDia({ dia, reservas, bloqueios, comReservar, seccaoFiltro }: Props) {
  const visiveis = seccaoFiltro ? reservas.filter((r) => r.seccao === seccaoFiltro) : reservas;
  return (
    <div className="cartao">
      {blocosDoDia(dia).map((b) => {
        const bloq = bloqueios.find((x) => sobrepoe({ inicio: new Date(x.inicio), fim: new Date(x.fim) }, b));
        const res = visiveis.find((r) => sobrepoe({ inicio: new Date(r.inicio), fim: new Date(r.fim) }, b));
        return (
          <div className="bloco" key={b.hora}>
            <div className="hora">{b.hora}</div>
            {bloq ? (
              <div className="bloqueado">Bloqueado: {bloq.motivo}</div>
            ) : res ? (
              <div className="ocupado">
                <strong>{res.responsavel}</strong> · {res.motivo}
                <div className="pequeno">{res.seccao ?? 'Departamento'} · até {horaDe(new Date(res.fim))}</div>
              </div>
            ) : comReservar ? (
              <div className="livre"><Link href={`/reservar?dia=${dia}&inicio=${b.hora}`}>Reservar</Link></div>
            ) : (
              <div className="livre pequeno">Livre</div>
            )}
          </div>
        );
      })}
      <div className="pequeno" style={{ marginTop: 8 }}>Blocos de 30 minutos, hora de Lisboa.</div>
    </div>
  );
}
