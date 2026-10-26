import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeDoMes, diasDaSemana, diaDaSemana, navegar, intervaloVisivel } from './calendario.ts';

test('outubro de 2026 começa na segunda 28 de setembro (1 de outubro é quinta)', () => {
  const g = gradeDoMes('2026-10-23');
  assert.equal(g.length, 42);
  assert.equal(g[0], '2026-09-28');
  assert.equal(g[41], '2026-11-08');
});

test('23 de outubro de 2026 é sexta (índice 4, com segunda = 0)', () => {
  assert.equal(diaDaSemana('2026-10-23'), 4);
});

test('a semana vai de segunda a domingo', () => {
  const s = diasDaSemana('2026-10-23');
  assert.equal(s[0], '2026-10-19');
  assert.equal(s[6], '2026-10-25');
});

test('navegação: semana ±7 dias, dia ±1, mês mantém o dia ou fica no último', () => {
  assert.equal(navegar('semana', '2026-10-23', 1), '2026-10-30');
  assert.equal(navegar('dia', '2026-10-31', 1), '2026-11-01');
  assert.equal(navegar('mes', '2026-10-23', 1), '2026-11-23');
  assert.equal(navegar('mes', '2026-01-31', 1), '2026-02-28');
  assert.equal(navegar('mes', '2026-03-31', -1), '2026-02-28');
});

test('intervalo da vista mês cobre 42 dias de Lisboa', () => {
  const v = intervaloVisivel('mes', '2026-10-23');
  assert.equal(v.dias.length, 42);
  assert.ok(v.fim > v.inicio);
});
