import pb from '@/lib/pocketbase/client'
import {
  Contrato,
  EtapaFunil,
  HistoricoNegocio,
  Meta,
  MetaKpi,
  MovimentoReceita,
  OrdemServico,
} from '@/types/crm'

// MOTOR central dos cinco KPIs da unidade de serviços
// (RCS, taxa de conversão de leads, ticket médio, OS no prazo e NRR).
//
// Recebe um período (data início/fim em AAAA-MM-DD, ou ano [+ mês]) e devolve,
// para cada KPI: valor realizado, meta do período (coleção "metas" — meta do
// mês quando o período é um único mês, anual quando é o ano inteiro ou período
// maior), diferença (realizado − meta) e percentual de atingimento
// (realizado ÷ meta × 100).
//
// Definições exatas:
// - RCS: soma do valor contratado (valor_mensal × prazo em meses — o mesmo
//   valor total do funil) dos contratos ASSINADOS no período;
//   "assinado no período" = data_inicio dentro dele (fallback: created).
// - Taxa de conversão de leads: negócios que ATINGIRAM a etapa 5 (Proposta) no
//   período ÷ negócios que ATINGIRAM a etapa 3 (Qualificado) × 100, via
//   historico_negocios — mesmo padrão do serviço de eficiência comercial
//   (src/services/eficiencia.ts), com etapas resolvidas pela coleção
//   etapas_funil pela posição (ordem).
// - Ticket médio: receita de serviços do período ÷ clientes distintos com
//   contrato assinado no período.
// - OS no prazo: OS concluídas com no_prazo=true ÷ OS concluídas no período
//   × 100 (base do recorte: data_encerramento; fallback data_abertura).
// - NRR: receita recorrente no FIM do período ÷ receita recorrente no INÍCIO
//   × 100, a partir dos movimentos de receita (competência AAAA-MM): última
//   competência ANTERIOR ao primeiro mês do período vs. última ≤ mês de fim
//   (a receita no início é a vigente antes de os movimentos do período
//   acontecerem).
//
// Sem base de cálculo: realizado = null e atingimento = null — quem consome
// exibe "—".
//
// SITUAÇÃO (classificação contra a meta, calculada sobre o atingimento):
// - Regra geral: atingimento >= 100% → "verde"; de 80% a <100% → "âmbar";
//   abaixo de 80% → "vermelho".
// - Exceção NRR (somente NRR): > 100% → "verde"; exatamente 100% → "âmbar";
//   abaixo de 100% → "vermelho".
// - Sem realizado ou sem meta (atingimento null) → situacao = null
//   (indeterminado — não classificar cor de forma enganosa; quem consome
//   exibe "—").

export type KpiUnidade = Extract<
  MetaKpi,
  'RCS' | 'taxa_conversao_leads' | 'ticket_medio' | 'os_no_prazo' | 'NRR'
>

export interface KpiResultado {
  kpi: KpiUnidade
  rotulo: string
  formato: 'percentual' | 'moeda'
  // valor calculado no período; null quando não há base (exibição "—")
  realizado: number | null
  // meta do período na coleção metas (undefined quando não cadastrada)
  meta: number | undefined
  // realizado − meta; null sem realizado ou sem meta
  diferenca: number | null
  // realizado ÷ meta × 100; null sem realizado ou sem meta
  atingimento: number | null
  // situação contra a meta, pelo atingimento:
  // geral — >=100% verde, 80–<100% âmbar, <80% vermelho;
  // NRR — >100% verde, ==100% âmbar, <100% vermelho;
  // null (indeterminado) sem realizado ou sem meta
  situacao: KpiSituacao
}

export type KpiSituacao = 'verde' | 'ambar' | 'vermelho' | null

export interface KpisPeriodo {
  // período normalizado usado no cálculo
  dataDe: string // 'YYYY-MM-DD'
  dataAte: string // 'YYYY-MM-DD'
  ano: number
  mes: number | undefined // 1-12 quando o período é um único mês
  // os cinco KPIs, na ordem oficial da unidade
  rcs: KpiResultado
  taxaConversaoLeads: KpiResultado
  ticketMedio: KpiResultado
  osNoPrazo: KpiResultado
  nrr: KpiResultado
  // lista plana (mesma ordem) para consumo genérico
  lista: KpiResultado[]
}

export interface KpisEntrada {
  dataDe?: string // 'YYYY-MM-DD'
  dataAte?: string // 'YYYY-MM-DD'
  ano?: number
  mes?: number // 1-12; com ano, define um período de mês único
  // id do responsável comercial (filtro global do Dashboard): filtra contratos
  // (contratos.responsavel), OS (responsavel_tecnico) e entradas de etapa
  // (owner do negócio); undefined/'' = todos
  responsavel?: string
}

export const ROTULOS_KPIS: Record<KpiUnidade, string> = {
  RCS: 'RCS (Receita de Serviços)',
  taxa_conversao_leads: 'Taxa de conversão de leads',
  ticket_medio: 'Ticket médio',
  os_no_prazo: 'OS no prazo',
  NRR: 'NRR (Net Revenue Retention)',
}

const FORMATO: Record<KpiUnidade, 'percentual' | 'moeda'> = {
  RCS: 'moeda',
  taxa_conversao_leads: 'percentual',
  ticket_medio: 'moeda',
  os_no_prazo: 'percentual',
  NRR: 'percentual',
}

// Ordem (posição) das etapas-alvo no funil de serviços:
// 3 = Qualificado (lead), 5 = Proposta — igual ao serviço de eficiência
const ORDEM_QUALIFICADO = 3
const ORDEM_PROPOSTA = 5

// ---------- helpers ----------

// Parte AAAA-MM-DD de uma data PocketBase (sem deslocamento de fuso)
const parteData = (d?: string) => d?.split(' ')[0].split('T')[0] || ''

const ultimoDiaMes = (ano: number, mes: number) => {
  const d = new Date(ano, mes, 0)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dividir = (dividendo: number | null, divisor: number) =>
  dividendo !== null && divisor > 0 ? (dividendo / divisor) * 100 : null

// ---------- base de dados do período ----------

type BaseKpis = {
  rcs: number | null
  clientesComContrato: number
  receitaServicos: number | null
  qtdQualificados: number | null
  qtdPropostas: number | null
  osConcluidas: number | null
  osNoPrazoQtd: number | null
  nrr: number | null
}

const carregarBase = async (de: string, ate: string, responsavel?: string): Promise<BaseKpis> => {
  const [contratos, movimentos, ordens, etapas, entradas] = await Promise.all([
    pb.collection('contratos').getFullList<Contrato>({}),
    pb.collection('movimentos_receita').getFullList<MovimentoReceita>({
      sort: 'competencia,created',
    }),
    pb.collection('ordens_servico').getFullList<OrdemServico>({}),
    pb.collection('etapas_funil').getFullList<EtapaFunil>({ sort: 'ordem' }),
    pb.collection('historico_negocios').getFullList<HistoricoNegocio>({
      filter: "tipo = 'entrada_etapa' || tipo = 'avanco' || tipo = 'avanco_forcado'",
      sort: 'created',
    }),
  ])

  // mapa id da etapa → ordem (renomear etapas não quebra o cálculo)
  const ordemEtapas = new Map<string, number>()
  etapas.forEach((e) => ordemEtapas.set(e.id, e.ordem))

  // --- filtro por responsável comercial (filtro global do Dashboard) ---
  // Mesma noção de responsável em todos os blocos: contratos →
  // contratos.responsavel; OS → ordens_servico.responsavel_tecnico; histórico
  // (entradas de etapa → negócios) → historico_negocios.owner (gravado pelo
  // hook com o owner do negócio na criação/avanço).
  const resp = responsavel || ''
  const contratoDoResp = (c: Contrato) => !resp || c.responsavel === resp
  const osDoResp = (o: OrdemServico) => !resp || o.responsavel_tecnico === resp
  const historicoDoResp = (h: HistoricoNegocio) => !resp || h.owner === resp

  // --- RCS e ticket médio: contratos assinados no período ---
  const assinados = contratos.filter((c) => {
    if (!contratoDoResp(c)) return false
    const base = parteData(c.data_inicio) || parteData(c.created)
    return !!base && base >= de && base <= ate
  })
  // Prazo em meses do contrato: data_fim − data_inicio (arredondado); sem
  // data_fim usa o prazo do negócio de origem ou, por fim, as 12 meses do
  // padrão do funil (mesma conta do valor total do contrato na tela).
  const prazoMeses = (c: Contrato) => {
    const ini = parteData(c.data_inicio)
    const fim = parteData(c.data_fim)
    if (ini && fim) {
      const dias =
        (new Date(fim).getTime() - new Date(ini).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      const meses = Math.round(dias)
      if (meses > 0) return meses
      return 0
    }
    return 12
  }
  const rcsAssinados = assinados.reduce((s, c) => s + (c.valor_mensal || 0) * prazoMeses(c), 0)
  const clientes = new Set<string>()
  assinados.forEach((c) => {
    if (c.cliente) clientes.add(c.cliente)
  })

  // --- conversão de leads: histórico de etapas ---
  // Negócios distintos que ATINGIRAM cada etapa-alvo no período (entradas de
  // etapa registradas em historico_negocios; entrar numa etapa mais avançada
  // implica ter passado pelas anteriores).
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

  // --- OS no prazo: concluídas no período ---
  const concluidas = ordens.filter((o) => {
    if (!osDoResp(o)) return false
    if (o.status !== 'concluída') return false
    const base = parteData(o.data_encerramento) || parteData(o.data_abertura)
    return !!base && base >= de && base <= ate
  })
  const osNoPrazoQtd = concluidas.filter((o) => o.no_prazo === true).length

  // --- NRR: receita recorrente no início vs. no fim do período ---
  // Receita recorrente de uma competência = soma dos movimentos daquele mês
  // (mesma semântica da tela Contratos). Início = última competência ANTERIOR
  // ao primeiro mês do período (fallback: primeira competência registrada);
  // fim = última competência ≤ mês do último dia.
  let nrr: number | null = null
  const receitaPorCompetencia = new Map<string, number>()
  for (const m of movimentos) {
    if (resp && m.responsavel !== resp) continue
    const comp = m.competencia || ''
    if (!comp) continue
    receitaPorCompetencia.set(comp, (receitaPorCompetencia.get(comp) || 0) + (m.valor_mensal || 0))
  }
  if (receitaPorCompetencia.size > 0) {
    const comps = Array.from(receitaPorCompetencia.keys()).sort()
    const mesInicio = de.slice(0, 7)
    const mesFim = ate.slice(0, 7)
    const compInicio = [...comps].reverse().find((c) => c < mesInicio) ?? comps[0]
    const compFim = [...comps].reverse().find((c) => c <= mesFim) ?? comps[comps.length - 1]
    const inicioValor = receitaPorCompetencia.get(compInicio) || 0
    const fimValor = receitaPorCompetencia.get(compFim) || 0
    if (inicioValor > 0 && compFim > compInicio) nrr = (fimValor / inicioValor) * 100
    else if (inicioValor > 0 && compFim === compInicio) nrr = 100
  }

  return {
    rcs: assinados.length > 0 ? rcsAssinados : null,
    clientesComContrato: clientes.size,
    receitaServicos: assinados.length > 0 ? rcsAssinados : null,
    qtdQualificados: qualificados.size > 0 ? qualificados.size : null,
    qtdPropostas: propostas.size > 0 ? propostas.size : null,
    osConcluidas: concluidas.length > 0 ? concluidas.length : null,
    osNoPrazoQtd,
    nrr,
  }
}

// ---------- metas ----------

const buscarMetas = async (ano: number): Promise<Meta[]> => {
  try {
    return await pb.collection('metas').getFullList<Meta>({ filter: `ano = ${ano}` })
  } catch {
    return []
  }
}

const metaDe = (metas: Meta[], kpi: KpiUnidade, mes: number | undefined) => {
  if (mes) {
    const mensal = metas.find((m) => m.kpi === kpi && (m.mes || 0) === mes)
    if (mensal) return mensal.valor_meta
  }
  const anual = metas.find((m) => m.kpi === kpi && (m.mes || 0) === 0)
  return anual?.valor_meta
}

const classificarSituacao = (kpi: KpiUnidade, atingimento: number | null): KpiSituacao => {
  if (atingimento === null) return null
  if (kpi === 'NRR') return situacaoNrr(atingimento)
  // regra geral: >=100% verde, 80 a <100% âmbar, <80% vermelho
  if (atingimento >= 100) return 'verde'
  if (atingimento >= 80) return 'ambar'
  return 'vermelho'
}

// Regra de situação do NRR (faixas próprias): >100% verde, exatamente 100%
// âmbar, <100% vermelho; null (indeterminado) sem valor apurável. Exportada
// para reuso pelos blocos que tratam de NRR (ex. mrr-nrr.ts) — fonte única
// da regra.
export function situacaoNrr(valor: number | null): KpiSituacao {
  if (valor === null) return null
  if (valor > 100) return 'verde'
  if (valor === 100) return 'ambar'
  return 'vermelho'
}

const construir = (
  kpi: KpiUnidade,
  realizado: number | null,
  meta: number | undefined,
): KpiResultado => {
  const atingimento =
    realizado !== null && meta !== undefined && meta !== 0 ? (realizado / meta) * 100 : null
  return {
    kpi,
    rotulo: ROTULOS_KPIS[kpi],
    formato: FORMATO[kpi],
    realizado,
    meta,
    diferenca: realizado !== null && meta !== undefined ? realizado - meta : null,
    atingimento,
    situacao: classificarSituacao(kpi, atingimento),
  }
}

// ---------- função central ----------

export async function calcularKpis(entrada: KpisEntrada = {}): Promise<KpisPeriodo> {
  // Período: dataDe/dataAte explícitos; senão ano [+ mês]; padrão = ano corrente
  const hoje = new Date()
  let ano = entrada.ano ?? hoje.getFullYear()
  let mes = entrada.mes
  let de = entrada.dataDe
  let ate = entrada.dataAte

  if (!de || !ate) {
    if (mes) {
      de = `${ano}-${String(mes).padStart(2, '0')}-01`
      ate = ultimoDiaMes(ano, mes)
    } else {
      de = `${ano}-01-01`
      ate = `${ano}-12-31`
    }
  } else {
    // deduz ano/mês do período informado (para escolher a meta)
    ano = Number(de.slice(0, 4)) || ano
    mes = de.slice(0, 7) === ate.slice(0, 7) ? Number(de.slice(5, 7)) : undefined
  }

  const [base, metas] = await Promise.all([
    carregarBase(de, ate, entrada.responsavel),
    buscarMetas(ano),
  ])

  const conversao =
    base.qtdQualificados !== null && base.qtdQualificados > 0
      ? ((base.qtdPropostas || 0) / base.qtdQualificados) * 100
      : null

  const ticket =
    base.receitaServicos !== null && base.clientesComContrato > 0
      ? base.receitaServicos / base.clientesComContrato
      : null

  const taxaOs =
    base.osConcluidas !== null && base.osConcluidas > 0
      ? (base.osNoPrazoQtd / base.osConcluidas) * 100
      : null

  const rcs = construir('RCS', base.rcs, metaDe(metas, 'RCS', mes))
  const taxaConversaoLeads = construir(
    'taxa_conversao_leads',
    conversao,
    metaDe(metas, 'taxa_conversao_leads', mes),
  )
  const ticketMedio = construir('ticket_medio', ticket, metaDe(metas, 'ticket_medio', mes))
  const osNoPrazo = construir('os_no_prazo', taxaOs, metaDe(metas, 'os_no_prazo', mes))
  const nrr = construir('NRR', base.nrr, metaDe(metas, 'NRR', mes))

  return {
    dataDe: de,
    dataAte: ate,
    ano,
    mes,
    rcs,
    taxaConversaoLeads,
    ticketMedio,
    osNoPrazo,
    nrr,
    lista: [rcs, taxaConversaoLeads, ticketMedio, osNoPrazo, nrr],
  }
}
