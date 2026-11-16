import pb from '@/lib/pocketbase/client'
import { EtapaFunil, HistoricoNegocio, VisitaComercial } from '@/types/crm'

// Indicadores de eficiência comercial: transformam o custo das visitas
// comerciais em custo por resultado do funil (lead qualificado, proposta,
// contrato assinado). Tudo é calculado a partir dos dados reais do Skip Cloud
// (coleções visitas_comerciais, historico_negocios, etapas_funil).
//
// Convenções:
// - "Contrato assinado" ainda não existe como campo; é derivado do histórico:
//   negócio que registrou entrada na etapa 6 (Compromisso) em historico_negocios
//   (tipo 'entrada_etapa'). Quando um marcador próprio de contrato surgir,
//   basta ajustar a detecção aqui — único lugar do cálculo.
// - As etapas 3/5/6 não são fixas por nome: são resolvidas pela coleção
//   etapas_funil pela posição (ordem), então renomear etapas não quebra o cálculo.
export interface EficienciaComercial {
  // insumos
  custoTotalProspeccao: number
  qtdVisitas: number
  qtdLeadsQualificados: number
  qtdPropostas: number
  qtdContratosAssinados: number
  // indicadores (null quando a base de divisão é zero)
  custoPorLeadQualificado: number | null
  custoPorProposta: number | null
  custoPorContratoAssinado: number | null
  custoMedioPorVisita: number | null
  visitasPorContratoAssinado: number | null
}

export interface EficienciaFiltros {
  dataDe?: string // 'YYYY-MM-DD' ou vazio
  dataAte?: string
  responsavel?: string // id do usuário ou 'todos'
}

// Ordem (posição) das etapas-alvo no funil de serviços:
// 3 = Qualificado, 5 = Proposta, 6 = Compromisso (contrato assinado)
const ORDEM_QUALIFICADO = 3
const ORDEM_PROPOSTA = 5
const ORDEM_CONTRATO = 6

const limparFiltro = (v?: string) => (v && v !== 'todos' ? v : '')

// Fronteira do período: a data da visita é um datetime do PocketBase
// ("YYYY-MM-DD HH:mm:ss.SSSZ"); comparamos como string ISO.
const dentroDoPeriodo = (data: string | undefined, de: string, ate: string): boolean => {
  if (!data) return !de && !ate
  if (de && data < `${de} 00:00:00.000Z`) return false
  if (ate && data > `${ate} 23:59:59.999Z`) return false
  return true
}

// Busca as etapas do funil e devolve o mapa id -> ordem.
const carregarOrdemEtapas = async (): Promise<Map<string, number>> => {
  const etapas = await pb.collection('etapas_funil').getFullList<EtapaFunil>({ sort: 'ordem' })
  const mapa = new Map<string, number>()
  etapas.forEach((e) => mapa.set(e.id, e.ordem))
  return mapa
}

// Conta negócios distintos que ATINGIRAM cada etapa-alvo dentro do período,
// a partir das entradas de etapa registradas em historico_negocios.
// Chegar a uma etapa mais avançada implica ter passado pelas anteriores
// (ex.: quem entrou na 5 no período atingiu a 3 no período).
const contarNegociosPorEtapa = async (
  ordemAtual: Map<string, number>,
  de: string,
  ate: string,
  responsavel: string,
): Promise<{ qualificados: Set<string>; propostas: Set<string>; contratos: Set<string> }> => {
  const alvos = [ORDEM_QUALIFICADO, ORDEM_PROPOSTA, ORDEM_CONTRATO]
  const qualificados = new Set<string>()
  const propostas = new Set<string>()
  const contratos = new Set<string>()

  const filtros = ["tipo = 'entrada_etapa'"]
  if (de) filtros.push(`created >= '${de} 00:00:00.000Z'`)
  if (ate) filtros.push(`created <= '${ate} 23:59:59.999Z'`)

  const entradas = await pb
    .collection('historico_negocios')
    .getFullList<HistoricoNegocio & { expand?: { deal?: { owner?: string } } }>({
      filter: filtros.join(' && '),
      expand: 'deal',
      sort: 'created',
    })

  for (const e of entradas) {
    // filtro de responsável: dono do negócio do histórico
    if (responsavel && e.expand?.deal?.owner !== responsavel) continue
    const ordem = e.etapa_para ? ordemAtual.get(e.etapa_para) : undefined
    if (ordem == null) continue
    for (const o of alvos) {
      if (ordem >= o) {
        if (o === ORDEM_QUALIFICADO) qualificados.add(e.deal)
        else if (o === ORDEM_PROPOSTA) propostas.add(e.deal)
        else contratos.add(e.deal)
      }
    }
  }

  return { qualificados, propostas, contratos }
}

export async function calcularEficienciaComercial(
  filtros: EficienciaFiltros = {},
): Promise<EficienciaComercial> {
  const de = limparFiltro(filtros.dataDe)
  const ate = limparFiltro(filtros.dataAte)
  const responsavel = limparFiltro(filtros.responsavel)

  const ordemEtapas = await carregarOrdemEtapas()
  const [visitas, contagens] = await Promise.all([
    pb.collection('visitas_comerciais').getFullList<VisitaComercial>({}),
    contarNegociosPorEtapa(ordemEtapas, de, ate, responsavel),
  ])

  const doPeriodo = visitas.filter(
    (v) => dentroDoPeriodo(v.data, de, ate) && (!responsavel || v.responsavel === responsavel),
  )

  const custoTotal = doPeriodo.reduce((s, v) => s + (v.custo_total || 0), 0)
  const qtdVisitas = doPeriodo.length
  const qtdQualificados = contagens.qualificados.size
  const qtdPropostas = contagens.propostas.size
  const qtdContratos = contagens.contratos.size

  const dividir = (dividendo: number, divisor: number) => (divisor > 0 ? dividendo / divisor : null)

  return {
    custoTotalProspeccao: custoTotal,
    qtdVisitas,
    qtdLeadsQualificados: qtdQualificados,
    qtdPropostas: qtdPropostas,
    qtdContratosAssinados: qtdContratos,
    custoPorLeadQualificado: dividir(custoTotal, qtdQualificados),
    custoPorProposta: dividir(custoTotal, qtdPropostas),
    custoPorContratoAssinado: dividir(custoTotal, qtdContratos),
    custoMedioPorVisita: dividir(custoTotal, qtdVisitas),
    visitasPorContratoAssinado: dividir(qtdVisitas, qtdContratos),
  }
}
