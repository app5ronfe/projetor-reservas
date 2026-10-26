import { redirect } from 'next/navigation';
import { sessaoAtual } from '../lib/projetor';

export default async function Inicio() {
  redirect((await sessaoAtual()) ? '/reservas' : '/login');
}
