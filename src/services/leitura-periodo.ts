// Serviço do bloco "Leitura do período" (topo do Dashboard): monta ATÉ TRÊS
// frases de uma linha só, cada uma com número + comparação + ação sugerida:
// 1. KPI mais distante da meta — entre os cinco KPIs (motor src/services/kpis.ts),
//    o de MENOR percentual de atingimento que tenha realizado e meta calculáveis.
// 2. Etapa gargalo do funil — a transição de menor conversão que o motor
//    src/services/funil.ts já identifica.
// 3. Variação do custo por contrato — custo por contrato assinado do período
//    atual (motor src/services/custo-aquisicao.ts) contra o período anterior
//    imediato de MESMA duração.
//
// Este módulo é PURA: não busca dados — recebe os resultados dos motores já
// carregados (pelos hooks useKpis/useFunil/useCustoAquisicao) e só redige as
// frases. Nenhum cálculo é duplicado: reutiliza os serviços existentes.
//
// Indicador sem dado suficiente (sem realizado/meta, sem gargalo, custo nulo
// em um dos dois períodos): a frase individual NÃO é inventada — é omitida.
// Sem nenhuma frase, o bloco exibe "sem dados suficientes no período".

import type { KpiUnidade, KpisPeriodo } from '@/services/kpis'
import type { FunilPeriodo } from '@/services/funil'
import type { CustoAquisicaoPeriodo } from '@/services/custo-aquisicao'
import { formatarMoeda, formatarNumero } from '@/services/custo-aquisicao'

export interface LeituraEntrada {
  dataDe: string // 'YYYY-MM-DD'
  dataAte: string // 'YYYY-MM-DD'
  // id do responsável comercial (filtro global do Dashboard); undefined/'' = todos
  responsavel?: string
}

export interface FraseLeitura {
  id: 'kpi' | 'gargalo' | 'custo'
  texto: string
}

// rótulo curto de negócio (mesma linguagem da faixa de KPIs)
const ROTULO_CURTO: Record<KpiUnidade, string> = {
  RCS: 'RCS',
  taxa_conversao_leads: 'Taxa de conversão de leads',
  ticket_medio: 'Ticket médio',
  os_no_prazo: 'OS no prazo',
  NRR: 'NRR',
}

// ação sugerida por KPI (linguagem de negócio, pt-BR)
const ACAO_KPI: Record<KpiUnidade, string> = {
  RCS: 'revisar pipeline de propostas',
  taxa_conversao_leads: 'revisar a qualidade dos leads e o discurso de proposta',
  ticket_medio: 'rever precificação e escopo dos contratos',
  os_no_prazo: 'revisar capacidade e prazos das ordens de serviço',
  NRR: 'reduzir churn e trabalhar expansão na base atual',
}

// ---------- período anterior imediato (mesma duração) ----------

export function periodoAnterior(de: string, ate: string): { dataDe: string; dataAte: string } {
  const msDia = 86400000
  const ini = Date.parse(`${de}T00:00:00Z`)
  const fim = Date.parse(`${ate}T00:00:00Z`)
  if (!Number.isFinite(ini) || !Number.isFinite(fim) || fim < ini)
    return { dataDe: de, dataAte: ate }
  const dias = Math.round((fim - ini) / msDia) + 1
  // término do anterior = véspera do início atual; início = mesma duração
  const antAte = new Date(ini - msDia)
  const antDe = new Date(ini - msDia * dias)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { dataDe: iso(antDe), dataAte: iso(antAte) }
}

// ---------- redação das frases ----------

const fmtValorKpi = (formato: 'moeda' | 'percentual', v: number) =>
  formato === 'moeda' ? formatarMoeda(v) : `${formatarNumero(v, 1)}%`

// Frase 1 — KPI mais distante da meta (menor atingimento com dado e meta)
function fraseKpi(kpis: KpisPeriodo): string | null {
  const comDado = kpis.lista.filter(
    (k) => k.realizado !== null && k.meta !== undefined && k.atingimento !== null,
  )
  if (comDado.length === 0) return null
  const pior = comDado.reduce((menor, k) => (k.atingimento! < menor.atingimento! ? k : menor))
  const a = pior.atingimento!
  const comparacao =
    a < 100
      ? `ficou ${formatarNumero(100 - a, 0)}% abaixo da meta`
      : `atingiu ${formatarNumero(a, 0)}% da meta (acima do alvo)`
  return (
    `${ROTULO_CURTO[pior.kpi]} ${comparacao} ` +
    `(${fmtValorKpi(pior.formato, pior.realizado!)} contra meta de ${fmtValorKpi(pior.formato, pior.meta!)}); ` +
    `sugestão: ${ACAO_KPI[pior.kpi]}`
  )
}

// Frase 2 — etapa gargalo do funil (menor conversão, já identificada pelo motor)
function fraseGargalo(funil: FunilPeriodo): string | null {
  const g = funil.gargalo
  if (!g || !Number.isFinite(g.conversao)) return null
  return (
    `Etapa ${g.etapaDe} → ${g.etapaPara} é o gargalo do funil, ` +
    `com ${formatarNumero(g.conversao, 0)}% de conversão; ` +
    `sugestão: priorizar os negócios parados nessa passagem`
  )
}

// Frase 3 — variação do custo por contrato vs. período anterior imediato
function fraseCusto(atual: CustoAquisicaoPeriodo, anterior: CustoAquisicaoPeriodo): string | null {
  const cAtual = atual.custoPorContrato
  const cAnt = anterior.custoPorContrato
  if (cAtual === null || cAnt === null || cAnt <= 0) return null
  const variacao = ((cAtual - cAnt) / cAnt) * 100
  const contexto = `(${formatarMoeda(cAtual)} vs ${formatarMoeda(cAnt)} no período anterior)`
  if (Math.abs(variacao) < 0.5) {
    return `Custo por contrato assinado ficou estável ${contexto}; sugestão: manter o padrão atual de prospecção`
  }
  const direcao = variacao > 0 ? 'subiu' : 'caiu'
  const acao =
    variacao > 0
      ? 'revisar o roteiro e os custos das visitas comerciais'
      : 'manter o padrão atual de prospecção'
  return `Custo por contrato assinado ${direcao} ${formatarNumero(Math.abs(variacao), 0)}% ${contexto}; sugestão: ${acao}`
}

// Função central: recebe os resultados dos motores (ou null enquanto carregam)
// e devolve apenas as frases com dado suficiente, nesta ordem.
export function montarLeituraPeriodo(entradas: {
  kpis: KpisPeriodo | null
  funil: FunilPeriodo | null
  custoAtual: CustoAquisicaoPeriodo | null
  custoAnterior: CustoAquisicaoPeriodo | null
}): FraseLeitura[] {
  const frases: FraseLeitura[] = []
  if (entradas.kpis) {
    const texto = fraseKpi(entradas.kpis)
    if (texto) frases.push({ id: 'kpi', texto })
  }
  if (entradas.funil) {
    const texto = fraseGargalo(entradas.funil)
    if (texto) frases.push({ id: 'gargalo', texto })
  }
  if (entradas.custoAtual && entradas.custoAnterior) {
    const texto = fraseCusto(entradas.custoAtual, entradas.custoAnterior)
    if (texto) frases.push({ id: 'custo', texto })
  }
  return frases
}
