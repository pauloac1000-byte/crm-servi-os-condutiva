import pb from '@/lib/pocketbase/client'
import { Contrato, HistoricoNegocio, VisitaComercial } from '@/types/crm'

// MOTOR central do bloco "Custo de aquisição" da unidade de serviços.
//
// Recebe um período (dataDe/dataAte em AAAA-MM-DD) e devolve as quatro medidas
// do bloco, o retorno por real investido e a série mensal dos últimos 12 meses
// (gasto em visitas × contratos assinados). Tudo a partir dos dados reais do
// Skip Cloud (coleções visitas_comerciais, contratos e historico_negocios +
// etapas_funil) — sem dados de exemplo.
//
// Definições exatas:
// - Custo total de prospecção: soma de visitas_comerciais.custo_total das
//   visitas com data dentro do período (campo calculado no servidor por hook —
//   combustível, pedágio, alimentação, hospedagem e outros custos).
// - Custo por lead qualificado: custo total ÷ negócios distintos que ATINGIRAM
//   a etapa 3 (Qualificado) no período, via historico_negocios.
// - Custo por proposta: custo total ÷ negócios distintos que ATINGIRAM a etapa
//   5 (Proposta) no período.
// - Custo por contrato assinado: custo total ÷ contratos assinados no período
//   (data_inicio dentro dele; fallback created — mesma regra do motor de KPIs).
// - Retorno por real investido: ticket médio (motor kpis.ts: receita de
//   serviços do período ÷ clientes com contrato) ÷ custo por contrato.
// - Série mensal: 12 meses até o fim do período — gasto de visitas por
//   competência (AAAA-MM) e contratos assinados por mês de data_inicio.
//
// Sem base de cálculo (divisão por zero ou período sem visitas): valor null —
// quem consome exibe "—".

export interface CustoAquisicaoPeriodo {
  dataDe: string
  dataAte: string
  // soma de custo_total das visitas do período; null sem visitas com custo
  custoTotalProspeccao: number | null
  // nº de leads qualificados (etapa 3) no período; null sem negócios na etapa
  leadsQualificados: number | null
  // nº de propostas (etapa 5) no período; null sem negócios na etapa
  propostas: number | null
  // nº de contratos assinados no período; null sem contratos
  contratosAssinados: number | null
  custoPorLeadQualificado: number | null
  custoPorProposta: number | null
  custoPorContrato: number | null
  // ticket médio do período (motor kpis.ts) usado no retorno
  ticketMedio: number | null
  // ticket médio ÷ custo por contrato; null sem ticket médio ou sem custo
  retornoPorReal: number | null
  // 12 meses até o fim do período
  mensal: { comp: string; gasto: number; contratos: number }[]
  // true quando visitas_comerciais não tem o campo de custo — o custo só pode
  // ser calculado com o campo presente (não é o caso deste projeto, que tem
  // custo_total gravado por hook; a checagem protege o bloco de mudanças de
  // schema silenciosas)
  semCampoCusto: boolean
}

export interface CustoAquisicaoEntrada {
  dataDe: string // 'YYYY-MM-DD'
  dataAte: string // 'YYYY-MM-DD'
  // id do responsável comercial (filtro global do Dashboard): visitas →
  // visitas_comerciais.responsavel; histórico → owner; contratos →
  // contratos.responsavel. undefined/'' = todos
  responsavel?: string
}

// ---------- helpers ----------

// Parte AAAA-MM-DD de uma data PocketBase (sem deslocamento de fuso)
const parteData = (d?: string) => d?.split(' ')[0].split('T')[0] || ''

const dividir = (dividendo: number | null, divisor: number | null) =>
  dividendo === null || divisor === null || divisor <= 0 ? null : dividendo / divisor

// ---------- função central ----------

export async function calcularCustoAquisicao(
  entrada: CustoAquisicaoEntrada,
): Promise<CustoAquisicaoPeriodo> {
  const de = entrada.dataDe
  const ate = entrada.dataAte
  const resp = entrada.responsavel || ''
  // filtro por responsável comercial (filtro global do Dashboard) — mesma
  // noção de responsável dos demais blocos
  const visitaDoResp = (v: VisitaComercial) => !resp || v.responsavel === resp
  const contratoDoResp = (c: Contrato) => !resp || c.responsavel === resp
  const historicoDoResp = (h: HistoricoNegocio) => !resp || h.owner === resp

  // 12 meses do gráfico: de 11 meses antes do mês do período até o mês de fim
  const anoFim = Number(ate.slice(0, 4))
  const mesFim = Number(ate.slice(5, 7))
  const inicioGrafico = new Date(anoFim, mesFim - 12, 1)
  const compInicioGrafico = `${inicioGrafico.getFullYear()}-${String(inicioGrafico.getMonth() + 1).padStart(2, '0')}`
  const compFimGrafico = ate.slice(0, 7)

  const [visitas, contratos, etapas, entradas] = await Promise.all([
    pb.collection('visitas_comerciais').getFullList<VisitaComercial>({}),
    pb.collection('contratos').getFullList<Contrato>({}),
    pb.collection('etapas_funil').getFullList<{ id: string; ordem: number }>({ sort: 'ordem' }),
    pb.collection('historico_negocios').getFullList<HistoricoNegocio>({
      filter: "tipo = 'entrada_etapa' || tipo = 'avanco' || tipo = 'avanco_forcado'",
      sort: 'created',
    }),
  ])

  // mapa id da etapa → ordem (renomear etapas não quebra o cálculo)
  const ordemEtapas = new Map<string, number>()
  etapas.forEach((e) => ordemEtapas.set(e.id, e.ordem))
  const ORDEM_QUALIFICADO = 3
  const ORDEM_PROPOSTA = 5

  // --- custo total de prospecção do período ---
  const visitasPeriodo = visitas.filter((v) => {
    if (!visitaDoResp(v)) return false
    const data = parteData(v.data || v.created)
    return !!data && data >= de && data <= ate
  })
  const temCampoCusto = visitas.some((v) => v.custo_total !== undefined && v.custo_total !== null)
  const custoTotal = visitasPeriodo.reduce((s, v) => s + (v.custo_total || 0), 0)
  const custoTotalProspeccao = visitasPeriodo.length === 0 || !temCampoCusto ? null : custoTotal

  // --- leads qualificados e propostas no período (mesma regra do motor kpis.ts) ---
  const qualificados = new Set<string>()
  const propostas = new Set<string>()
  for (const e of entradas) {
    if (!historicoDoResp(e)) continue
    const data = parteData(e.created)
    if (!data || data < de || data > ate) continue
    const ordem = e.etapa_para ? ordemEtapas.get(e.etapa_para) : undefined
    if (ordem == null) continue
    if (ordem >= ORDEM_PROPOSTA) propostas.add(e.deal)
    if (ordem >= ORDEM_QUALIFICADO) qualificados.add(e.deal)
  }
  const leadsQualificados = qualificados.size > 0 ? qualificados.size : null
  const propostasQtd = propostas.size > 0 ? propostas.size : null

  // --- contratos assinados no período (mesma regra do motor kpis.ts) ---
  const assinados = contratos.filter((c) => {
    if (!contratoDoResp(c)) return false
    const base = parteData(c.data_inicio) || parteData(c.created)
    return !!base && base >= de && base <= ate
  })
  const contratosAssinados = assinados.length > 0 ? assinados.length : null

  // --- ticket médio do período (mesma definição do motor kpis.ts) ---
  const clientes = new Set<string>()
  assinados.forEach((c) => {
    if (c.cliente) clientes.add(c.cliente)
  })
  const prazoMeses = (c: Contrato) => {
    const ini = parteData(c.data_inicio)
    const fim = parteData(c.data_fim)
    if (ini && fim) {
      const meses = Math.round(
        (new Date(fim).getTime() - new Date(ini).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
      )
      if (meses > 0) return meses
      return 0
    }
    return 12
  }
  const receitaServicos = assinados.reduce(
    (s, c) => s + (c.valor_implantacao || 0) + (c.valor_mensal || 0) * prazoMeses(c),
    0,
  )
  const ticketMedio =
    assinados.length > 0 && clientes.size > 0 ? receitaServicos / clientes.size : null

  // --- custo por lead / proposta / contrato ---
  const custoPorLeadQualificado = dividir(custoTotalProspeccao, leadsQualificados)
  const custoPorProposta = dividir(custoTotalProspeccao, propostasQtd)
  const custoPorContrato = dividir(custoTotalProspeccao, contratosAssinados)

  // --- retorno por real investido: ticket médio ÷ custo por contrato ---
  const retornoPorReal =
    ticketMedio !== null && custoPorContrato !== null && custoPorContrato > 0
      ? ticketMedio / custoPorContrato
      : null

  // --- série mensal dos últimos 12 meses ---
  const gastoPorCompetencia = new Map<string, number>()
  for (const v of visitas) {
    if (!visitaDoResp(v)) continue
    const data = parteData(v.data || v.created)
    if (!data) continue
    const comp = data.slice(0, 7)
    if (comp < compInicioGrafico || comp > compFimGrafico) continue
    gastoPorCompetencia.set(comp, (gastoPorCompetencia.get(comp) || 0) + (v.custo_total || 0))
  }

  // contratos do gráfico: janela completa dos 12 meses (não só o período)
  const contratosPorMes = new Map<string, number>()
  for (const c of contratos) {
    if (!contratoDoResp(c)) continue
    const base = parteData(c.data_inicio) || parteData(c.created)
    if (!base) continue
    const comp = base.slice(0, 7)
    if (comp < compInicioGrafico || comp > compFimGrafico) continue
    contratosPorMes.set(comp, (contratosPorMes.get(comp) || 0) + 1)
  }

  const mensal: { comp: string; gasto: number; contratos: number }[] = []
  for (let i = 0; i < 12; i++) {
    const mes = new Date(inicioGrafico.getFullYear(), inicioGrafico.getMonth() + i, 1)
    const comp = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`
    mensal.push({
      comp,
      gasto: gastoPorCompetencia.get(comp) || 0,
      contratos: contratosPorMes.get(comp) || 0,
    })
  }

  return {
    dataDe: de,
    dataAte: ate,
    custoTotalProspeccao,
    leadsQualificados,
    propostas: propostasQtd,
    contratosAssinados,
    custoPorLeadQualificado,
    custoPorProposta,
    custoPorContrato,
    ticketMedio,
    retornoPorReal,
    mensal,
    semCampoCusto: visitas.length > 0 && !temCampoCusto,
  }
}

// ---------- formatação compartilhada (usada pelo componente do bloco) ----------

export const formatarMoeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)

export const formatarIndicadorMoeda = (v: number | null) => (v === null ? '—' : formatarMoeda(v))

export const formatarNumero = (v: number, casas = 2) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  }).format(v)
