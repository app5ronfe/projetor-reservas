import { test } from "node:test";
import assert from "node:assert/strict";
import { prazoReserva, prazoPassado, sobrepoe, validarIntervalo, validarCampos, lisboaParaInstante, partesLisboa } from "./regras.ts";

test("prazo de sábado 10:00 em horário de verão (UTC+1) é sexta 21:00 Lisboa = 20:00 UTC", () => {
  const inicio = lisboaParaInstante(2026, 10, 24, 10, 0);
  assert.equal(prazoReserva(inicio).toISOString(), "2026-10-23T20:00:00.000Z");
});

test("prazo de sábado 00:30 é também sexta 21:00 (não há janela à noite)", () => {
  const inicio = lisboaParaInstante(2026, 10, 24, 0, 30);
  assert.equal(prazoReserva(inicio).toISOString(), "2026-10-23T20:00:00.000Z");
});

test("prazo em horário de inverno (UTC+0): sexta 21:00 = 21:00 UTC", () => {
  const inicio = lisboaParaInstante(2026, 11, 7, 9, 0);
  assert.equal(prazoReserva(inicio).toISOString(), "2026-11-06T21:00:00.000Z");
});

test("às 20:59 do dia anterior aceita; às 21:01 recusa", () => {
  const inicio = lisboaParaInstante(2026, 10, 24, 10, 0);
  assert.equal(prazoPassado(inicio, lisboaParaInstante(2026, 10, 23, 20, 59)), false);
  assert.equal(prazoPassado(inicio, lisboaParaInstante(2026, 10, 23, 21, 1)), true);
});

test("partes de Lisboa para um instante conhecido", () => {
  const p = partesLisboa(new Date("2026-10-23T20:00:00Z"));
  assert.deepEqual([p.d, p.h, p.min], [23, 21, 0]);
});

test("blocos de 1 hora: aceita 10:00–12:00, recusa 10:30 e duração de 90 min", () => {
  const ok = { inicio: lisboaParaInstante(2026, 10, 24, 10, 0), fim: lisboaParaInstante(2026, 10, 24, 12, 0) };
  assert.equal(validarIntervalo(ok), null);
  assert.equal(validarIntervalo({ inicio: lisboaParaInstante(2026, 10, 24, 10, 30), fim: lisboaParaInstante(2026, 10, 24, 11, 30) })?.codigo, "BLOCO_INVALIDO");
  assert.equal(validarIntervalo({ inicio: lisboaParaInstante(2026, 10, 24, 10, 0), fim: lisboaParaInstante(2026, 10, 24, 11, 30) })?.codigo, "BLOCO_INVALIDO");
});

test("fim antes do início é recusado", () => {
  assert.equal(validarIntervalo({ inicio: lisboaParaInstante(2026, 10, 24, 11, 0), fim: lisboaParaInstante(2026, 10, 24, 10, 0) })?.codigo, "INTERVALO_INVALIDO");
});

test("sobreposição: blocos encostados não se sobrepõem; cruzados sim", () => {
  const a = { inicio: lisboaParaInstante(2026, 10, 24, 10, 0), fim: lisboaParaInstante(2026, 10, 24, 11, 0) };
  const b = { inicio: lisboaParaInstante(2026, 10, 24, 11, 0), fim: lisboaParaInstante(2026, 10, 24, 12, 0) };
  const c = { inicio: lisboaParaInstante(2026, 10, 24, 10, 30), fim: lisboaParaInstante(2026, 10, 24, 12, 30) };
  assert.equal(sobrepoe(a, b), false);
  assert.equal(sobrepoe(a, c), true);
});

test("campos obrigatórios: responsável, motivo e secção ou departamento", () => {
  assert.equal(validarCampos({ responsavel: "", motivo: "x", seccao: "Alcateia" })?.codigo, "RESPONSAVEL_EM_FALTA");
  assert.equal(validarCampos({ responsavel: "Ana", motivo: " ", seccao: "Alcateia" })?.codigo, "MOTIVO_EM_FALTA");
  assert.equal(validarCampos({ responsavel: "Ana", motivo: "Reunião" })?.codigo, "SECCAO_EM_FALTA");
  assert.equal(validarCampos({ responsavel: "Ana", motivo: "Reunião", departamento: "Comunicação" }), null);
  assert.equal(validarCampos({ responsavel: "Ana", motivo: "Reunião", entidade: "fna" }), null);
  assert.equal(validarCampos({ responsavel: "Ana", motivo: "Reunião", entidade: "outro" })?.codigo, "DESCRICAO_EM_FALTA");
  assert.equal(validarCampos({ responsavel: "Ana", motivo: "Reunião", entidade: "outro", descricao: "Visita da junta" }), null);
});
