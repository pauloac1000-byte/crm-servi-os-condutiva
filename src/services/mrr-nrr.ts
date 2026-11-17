import pb from '@/lib/pocketbase/client'
import { Contrato, MovimentoReceita } from '@/types/crm'
import { situacaoNrr, type KpiSituacao } from '@/services/kpis'

// MOTOR central do bloco "Receita recorrente" (MRR/NRR) da unidade de serviços.
//
// Recebe um período (dataDe/dataAte em AAAA-MM-DD) e devolve:
// - Série do MRR dos últimos 12 meses: receita recorrente vigente em cada
//   competência (AAAA-MM), derivada dos CONTRATOS — soma do valor_mensal dos
//   contratos vigentes na competência (data_inicio/data_fim, status != encerrado
//   no mês; encerrado entra até a competência do fim, inclusive).
// - NRR do período: receita recorrente no FIM ÷ no INÍCIO × 100 — MESMA
//   definição do motor kpis.ts (receita de uma competência = soma dos
//   movimentos daquele mês; início = última competência ANTERIOR ao primeiro
//   mês do período, fallback primeira registrada; fim = última ≤ mês de fim).
//   A CLASSIFICAÇÃO (verde/âmbar/vermelho) vem de kpis.ts — reutilizada, não
//   duplicada (export `situacaoNrr`).
// - Composição do período, na sequência pedida: receita inicial (MRR do
//   início), novos, expansão, contração, churn (soma dos movimentos do período
//   por tipo) e receita final (MRR do fim).
//
// Sem receita recorrente no período: `semDados` = true e os números vêm null —
// quem consome exibe "—" e a mensagem de vazio (nunca zeros).

export interface MrrNrrPeriodo {
  dataDe: string
  dataAte: string
  // 12 competências AAAA-MM até o mês de fim do período
  mrrMensal: { comp: string; mrr: number }[]
  // MRR do início do período (competência anterior à primeira); null sem movimentos
  receitaInicial: number | null
  // MRR do fim do período (última competência ≤ mês de fim); null sem movimentos
  receitaFinal: number | null
  // NRR do período em % (mesma fórmula do kpis.ts); null sem base apurável
  nrr: number | null
  // situação do NRR pela regra exportada do kpis.ts: >100% verde,
  // ==100% âmbar, <100% vermelho; null sem NRR apurável
  situacaoNrr: KpiSituacao
  // soma dos movimentos de receita do período por tipo (valor_mensal);
  // renovação não entra na composição (mantém o saldo — mostrada como
  // "outros" apenas quando existir)
  movimentosPorTipo: { novos: number; expansao: number; contracao: number; churn: number }
  // soma de movimentos do tipo "renovação" do período (fora da composição base)
  renovacoes: number
  // true quando não há NENHUM movimento nem contrato com valor mensal
  semDados: boolean
}

export interface MrrNrrEntrada {
  dataDe: string // 'YYYY-MM-DD'
  dataAte: string // 'YYYY-MM-DD'
}

// ---------- helpers ----------

// Parte AAAA-MM-DD de uma data PocketBase (sem deslocamento de fuso)
const parteData = (d?: string) => d?.split(' ')[0].split('T')[0] || ''

const compsDoPeriodo = (de: string, ate: string) => {
  const anoFim = Number(ate.slice(0, 4))
  const mesFim = Number(ate.slice(5, 7))
  const inicio = new Date(Number(de.slice(0, 4)), Number(de.slice(5, 7)) - 12, 1)
  const inicioComp = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`
  return { inicioComp, fimComp: ate.slice(0, 7), anoFim, mesFim }
}

const somaPorTipo = (ms: MovimentoReceita[]) => {
  const soma = { novos: 0, expansao: 0, contracao: 0, churn: 0, renovacao: 0 }
  for (const m of ms) {
    const v = m.valor_mensal || 0
    if (m.tipo === 'novo') soma.novos += v
    else if (m.tipo === 'expansão') soma.expansao += v
    else if (m.tipo === 'contração') soma.contracao += v
    else if (m.tipo === 'churn') soma.churn += v
    else if (m.tipo === 'renovação') soma.renovacao += v
  }
  return soma
}

// ---------- função central ----------

export async function calcularMrrNrr(entrada: MrrNrrEntrada): Promise<MrrNrrPeriodo> {
  const de = entrada.dataDe
  const ate = entrada.dataAte

  const [contratos, movimentos] = await Promise.all([
    pb.collection('contratos').getFullList<Contrato>({}),
    pb.collection('movimentos_receita').getFullList<MovimentoReceita>({
      sort: 'competencia,created',
    }),
  ])

  const { inicioComp, fimComp } = compsDoPeriodo(de, ate)

  // --- MRR por competência, a partir dos movimentos (mesma semântica do
  // --- kpis.ts e da tela Contratos): soma dos movimentos daquele mês.
  // --- Contratos vigentes completam as competências sem movimento (contrato
  // --- criado antes da janela): vigência por data_inicio/data_fim/status.
  const receitaPorCompetencia = new Map<string, number>()
  for (const m of movimentos) {
    const comp = m.competencia || ''
    if (!comp) continue
    receitaPorCompetencia.set(comp, (receitaPorCompetencia.get(comp) || 0) + (m.valor_mensal || 0))
  }

  // competências que têm contrato vigente mas nenhum movimento registrado
  const mesesContratados = new Map<string, number>()
  for (const c of contratos) {
    if (c.status === 'suspenso') continue
    const ini = parteData(c.data_inicio) || parteData(c.created)
    if (!ini) continue
    const compIni = ini.slice(0, 7)
    const fim = parteData(c.data_fim)
    const compFim =
      c.status === 'encerrado' && fim ? fim.slice(0, 7) : fim ? fim.slice(0, 7) : fimComp
    if (c.status === 'encerrado' && !fim) {
      // encerrado sem data_fim: vigente até hoje (churn só existe se houver movimento)
      for (let comp = compIni; comp <= fimComp; comp = proximaComp(comp)) {
        mesesContratados.set(comp, (mesesContratados.get(comp) || 0) + (c.valor_mensal || 0))
      }
      continue
    }
    for (let comp = compIni; comp <= compFim; comp = proximaComp(comp)) {
      mesesContratados.set(comp, (mesesContratados.get(comp) || 0) + (c.valor_mensal || 0))
    }
  }

  // série: 12 competências até o mês de fim do período
  const mrrMensal: { comp: string; mrr: number }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(Number(fimComp.slice(0, 4)), Number(fimComp.slice(5, 7)) - 12 + i, 1)
    const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const porMovimento = receitaPorCompetencia.get(comp)
    // preferência: movimento registrado na competência; senão, contratado
    const mrr = porMovimento !== undefined ? porMovimento : mesesContratados.get(comp) || 0
    mrrMensal.push({ comp, mrr })
  }

  // --- NRR do período: MESMA definição do motor kpis.ts ---
  let nrr: number | null = null
  let receitaInicial: number | null = null
  let receitaFinal: number | null = null
  if (receitaPorCompetencia.size > 0) {
    const comps = Array.from(receitaPorCompetencia.keys()).sort()
    const mesInicio = de.slice(0, 7)
    const mesFim = ate.slice(0, 7)
    const compInicio = [...comps].reverse().find((c) => c < mesInicio) ?? comps[0]
    const compFim = [...comps].reverse().find((c) => c <= mesFim) ?? comps[comps.length - 1]
    const inicioValor = receitaPorCompetencia.get(compInicio) || 0
    const fimValor = receitaPorCompetencia.get(compFim) || 0
    receitaInicial = inicioValor
    receitaFinal = fimValor
    if (inicioValor > 0 && compFim > compInicio) nrr = (fimValor / inicioValor) * 100
    else if (inicioValor > 0 && compFim === compInicio) nrr = 100
  }

  // --- composição do período: movimentos dentro do período ---
  const movimentosPeriodo = movimentos.filter((m) => {
    const comp = m.competencia || ''
    return !!comp && comp >= inicioComp && comp <= fimComp
  })
  const porTipo = somaPorTipo(movimentosPeriodo)

  // sem NRR via movimentos, tenta via contratos vigentes (mesma definição:
  // receita no início vs. no fim do período)
  if (nrr === null && receitaPorCompetencia.size === 0) {
    const iniValorC = mrrContratadoEm(de.slice(0, 7), mesesContratados)
    const fimValorC = mrrContratadoEm(fimComp, mesesContratados)
    if (iniValorC > 0) {
      receitaInicial = iniValorC
      receitaFinal = fimValorC
      nrr = (fimValorC / iniValorC) * 100
    }
  }

  // composição: receita inicial/final da série (fallback contratado)
  if (receitaInicial === null) {
    const iniComp = de.slice(0, 7)
    const antes = [...compsAntesDe(iniComp, receitaPorCompetencia)].sort()
    const ultimaAntes = antes[antes.length - 1]
    receitaInicial = (ultimaAntes && receitaPorCompetencia.get(ultimaAntes)) || null
  }
  if (receitaFinal === null) {
    const ultimaAte = [...receitaPorCompetencia.keys()]
      .filter((c) => c <= fimComp)
      .sort()
      .pop()
    receitaFinal = (ultimaAte && receitaPorCompetencia.get(ultimaAte)) || null
  }

  const semDados = contratos.length === 0 && movimentos.length === 0

  return {
    dataDe: de,
    dataAte: ate,
    mrrMensal,
    receitaInicial,
    receitaFinal,
    nrr,
    situacaoNrr: situacaoNrr(nrr),
    movimentosPorTipo: {
      novos: porTipo.novos,
      expansao: porTipo.expansao,
      contracao: porTipo.contracao,
      churn: porTipo.churn,
    },
    renovacoes: porTipo.renovacao,
    semDados,
  }
}

// ---------- helpers internos ----------

// Competência AAAA-MM seguinte
function proximaComp(comp: string): string {
  const a = Number(comp.slice(0, 4))
  const m = Number(comp.slice(5, 7))
  const d = new Date(a, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// MRR contratado em uma competência (0 quando não registrada)
function mrrContratadoEm(comp: string, meses: Map<string, number>): number {
  return meses.get(comp) || 0
}

// Competências de movimento anteriores a uma competência (para o fallback)
function compsAntesDe(comp: string, mapa: Map<string, number>): string[] {
  return Array.from(mapa.keys()).filter((c) => c < comp)
}

// ---------- formatação (usada pelo componente do bloco) ----------

export const formatarMoedaMrr = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)

export const formatarMoedaMrrOuTraco = (v: number | null) =>
  v === null ? '—' : formatarMoedaMrr(v)

export const formatarPercentualNrr = (v: number | null) =>
  v === null ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v)}%`
