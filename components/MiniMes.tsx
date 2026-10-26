import Link from 'next/link';
import { diaAtual } from '../lib/tempo';
import { DIAS_CURTOS, gradeDoMes, mesmoMes, navegar, tituloMes, type Vista } from '../lib/calendario';

/** Mini-calendário lateral: setas para mudar de mês e toque num dia para o ver. */
export default function MiniMes({ dia, vista }: { dia: string; vista: Vista }) {
  const hoje = diaAtual();
  const mudar = (sentido: -1 | 1) => `/reservas?vista=${vista}&dia=${navegar('mes', dia, sentido)}`;
  const alvo = vista === 'mes' ? 'dia' : vista;
  return (
    <div className="mini">
      <div className="mini-cab">
        <strong>{tituloMes(dia)}</strong>
        <span>
          <Link href={mudar(-1)} aria-label="Mês anterior">‹</Link>
          <Link href={mudar(1)} aria-label="Mês seguinte">›</Link>
        </span>
      </div>
      <div className="mini-grelha">
        {DIAS_CURTOS.map((d) => <span key={d} className="mini-dn">{d[0]}</span>)}
        {gradeDoMes(dia).map((d) => (
          <Link key={d} href={`/reservas?vista=${alvo}&dia=${d}`}
            className={['mini-d', mesmoMes(d, dia) ? '' : 'fora', d === hoje ? 'hoje' : '', d === dia ? 'sel' : ''].filter(Boolean).join(' ')}>
            {Number(d.slice(8))}
          </Link>
        ))}
      </div>
    </div>
  );
}
