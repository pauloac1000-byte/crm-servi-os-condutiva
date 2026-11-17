import pb from '@/lib/pocketbase/client'
import { Deal, EtapaFunil, HistoricoNegocio } from '@/types/crm'
import { valorOportunidade } from '@/lib/valor-oportunidade'

// Motor do funil de vendas de SERVIÇOS: conta quantos negócios atingiram cada
// etapa no período, a conversão entre etapas, a conversão total (etapa 7 ÷
// etapa 1), o tempo médio de permanência em cada etapa, o gargalo e a etapa
// com mais perdas. Tudo a partir dos dados reais do Skip Cloud (coleções
// historico_negocios, etapas_funil e deals).
//
// Convenções:
// - Funil cumulativo: negócio que atingiu uma etapa mais avançada também conta
//   nas anteriores (mesma regra do motor de KPIs, src/services/kpis.ts).
// - Etapas resolvidas pela coleção etapas_funil pela posição (ordem), não por
//   nome; renomear etapas não quebra o cálculo.
// - "Atingiu a etapa no período": entrada (entrada_etapa / avanco / avanco_forcado)
//   com data dentro do período (fallback sem período: todo o histórico).
// - Tempo de permanência: diferença entre a entrada numa etapa e a entrada na
//   seguinte (registros entrada_etapa), para entradas feitas no período. Estadias
//   ainda em aberto (sem saída registrada) não entram na média.
// - Perda: não existe etapa "Perdido" nem tipo de histórico de perda. Um negócio
//   perdido tem deals.status = 'perdido' e deals.etapa_anterior = etapa em que
//   parou. Conta-se por etapa_anterior, com data de referência deals.updated.
// - Sem base de cálculo (divisão por zero): devolve null — quem consome exibe "—".

export interface FunilEtapaResultado {
  ordem: number
  nome: string
  cor?: string
  // negócios distintos que atingiram a etapa no período (cumulativo)
  negocios: number
  // soma do valor dos negócios que atingiram a etapa no período (R$)
  valor: number
  // conversão desta etapa para a seguinte (%); null sem base ou na última etapa
  conversaoProxima: number | null
  // tempo médio de permanência na etapa (dias); null sem estadias concluídas
  tempoMedioDias: number | null
  // negócios perdidos cuja última etapa foi esta, no período
  perdidos: number
  // true quando esta é a origem da transição de menor conversão do período
  gargalo: boolean
}

export interface FunilGargalo {
  etapaDe: string
  etapaPara: string
  conversao: number
}

export interface FunilPeriodo {
  dataDe?: string // 'YYYY-MM-DD'
  dataAte?: string // 'YYYY-MM-DD'
  // etapas na ordem do funil
  etapas: FunilEtapaResultado[]
  // negócios que atingiram a última etapa ÷ negócios que atingiram a primeira × 100
  conversaoTotal: number | null
  // transição de menor conversão do período (null sem transições calculáveis)
  gargalo: FunilGargalo | null
  // etapa com mais negócios perdidos no período (null sem perdas)
  etapaMaisPerdas: { nome: string; quantidade: number } | null
  // tempo médio de ciclo Lead → Cliente ativo (dias); null sem ciclos completos no período
  tempoMedioCicloDias: number | null
}

export interface FunilEntrada {
  dataDe?: string
  dataAte?: string
}

// ---------- helpers ----------

// Parte AAAA-MM-DD de uma data PocketBase (sem deslocamento de fuso)
const parteData = (d?: string) => d?.split(' ')[0].split('T')[0] || ''

// Instante de um datetime PocketBase ("AAAA-MM-DD HH:mm:ss.sssZ")
const instante = (d: string) => Date.parse(d.replace(' ', 'T'))

const dentroDoPeriodo = (data: string, de: string, ate: string) => {
  const parte = parteData(data)
  if (!parte) return false
  if (de && parte < de) return false
  if (ate && parte > ate) return false
  return true
}

const percentual = (dividendo: number, divisor: number) =>
  divisor > 0 ? (dividendo / divisor) * 100 : null

// ---------- função central ----------

export async function calcularFunil(entrada: FunilEntrada = {}): Promise<FunilPeriodo> {
  const de = entrada.dataDe || ''
  const ate = entrada.dataAte || ''

  const [etapasFunil, historico, todosDeals] = await Promise.all([
    pb.collection('etapas_funil').getFullList<EtapaFunil>({ sort: 'ordem' }),
    pb.collection('historico_negocios').getFullList<HistoricoNegocio>({
      filter: "tipo = 'entrada_etapa' || tipo = 'avanco' || tipo = 'avanco_forcado'",
      sort: 'created',
    }),
    pb.collection('deals').getFullList<Deal>({}),
  ])
  // perdas: só negócios com status perdido
  const dealsPerdidos = todosDeals.filter((d) => d.status === 'perdido')

  // mapa id da etapa → ordem (renomear etapas não quebra o cálculo)
  const ordemPorId = new Map<string, number>()
  etapasFunil.forEach((e) => ordemPorId.set(e.id, e.ordem))

  // --- negócios que atingiram cada etapa (cumulativo) ---
  const atingiram = new Map<number, Set<string>>()
  etapasFunil.forEach((e) => atingiram.set(e.ordem, new Set<string>()))
  for (const h of historico) {
    if (!dentroDoPeriodo(h.created, de, ate)) continue
    const ordem = h.etapa_para ? ordemPorId.get(h.etapa_para) : undefined
    if (ordem == null) continue
    for (const e of etapasFunil) {
      if (e.ordem <= ordem) atingiram.get(e.ordem)?.add(h.deal)
    }
  }

  // --- tempo de permanência: linha do tempo por negócio (só entradas em etapa) ---
  const linhaDoTempo = new Map<string, { ordem: number; created: string }[]>()
  const entradasEtapa = historico.filter((h) => h.tipo === 'entrada_etapa')
  for (const h of entradasEtapa) {
    const ordem = h.etapa_para ? ordemPorId.get(h.etapa_para) : undefined
    if (ordem == null) continue
    const lista = linhaDoTempo.get(h.deal) || []
    lista.push({ ordem, created: h.created })
    linhaDoTempo.set(h.deal, lista)
  }
  const tempos = new Map<number, number[]>()
  for (const lista of linhaDoTempo.values()) {
    lista.sort((a, b) => instante(a.created) - instante(b.created))
    for (let i = 0; i < lista.length - 1; i++) {
      const atual = lista[i]
      if (!dentroDoPeriodo(atual.created, de, ate)) continue
      const dias = (instante(lista[i + 1].created) - instante(atual.created)) / 86400000
      if (!Number.isFinite(dias) || dias < 0) continue
      const acumulado = tempos.get(atual.ordem) || []
      acumulado.push(dias)
      tempos.set(atual.ordem, acumulado)
    }
  }

  // --- perdas: negócios com status perdido, contados pela última etapa ---
  const perdasPorOrdem = new Map<number, number>()
  for (const d of dealsPerdidos) {
    if (!dentroDoPeriodo(d.updated, de, ate)) continue
    const ordem = d.etapa_anterior ? ordemPorId.get(d.etapa_anterior) : undefined
    if (ordem == null) continue
    perdasPorOrdem.set(ordem, (perdasPorOrdem.get(ordem) || 0) + 1)
  }

  // --- resultado por etapa ---
  // mapa id do negócio → deal, para somar o valor por etapa
  const dealPorId = new Map<string, Deal>()
  todosDeals.forEach((d) => dealPorId.set(d.id, d))

  const etapas: FunilEtapaResultado[] = etapasFunil.map((e, i) => {
    const negocios = atingiram.get(e.ordem)?.size || 0
    const proxima = etapasFunil[i + 1]
    const negociosProxima = proxima ? atingiram.get(proxima.ordem)?.size || 0 : 0
    const duracoes = tempos.get(e.ordem) || []
    const conjuntoEtapa = atingiram.get(e.ordem)
    // soma do valor de todos os negócios que atingiram a etapa no período
    const valorEtapa = conjuntoEtapa
      ? [...conjuntoEtapa].reduce((s, dealId) => {
          const deal = dealPorId.get(dealId)
          return s + (deal ? valorOportunidade(deal) : 0)
        }, 0)
      : 0
    return {
      ordem: e.ordem,
      nome: e.nome,
      cor: e.cor,
      negocios,
      valor: valorEtapa,
      conversaoProxima: proxima && negocios > 0 ? percentual(negociosProxima, negocios) : null,
      tempoMedioDias:
        duracoes.length > 0 ? duracoes.reduce((s, d) => s + d, 0) / duracoes.length : null,
      perdidos: perdasPorOrdem.get(e.ordem) || 0,
      gargalo: false,
    }
  })

  // gargalo: transição de menor conversão entre etapas consecutivas
  let gargalo: FunilGargalo | null = null
  let indiceGargalo = -1
  etapas.forEach((e, i) => {
    if (e.conversaoProxima === null) return
    if (gargalo === null || e.conversaoProxima < gargalo.conversao) {
      gargalo = {
        etapaDe: e.nome,
        etapaPara: etapas[i + 1].nome,
        conversao: e.conversaoProxima,
      }
      indiceGargalo = i
    }
  })
  if (indiceGargalo >= 0) etapas[indiceGargalo].gargalo = true

  // etapa com mais perdas (empate: a primeira do funil)
  let etapaMaisPerdas: FunilPeriodo['etapaMaisPerdas'] = null
  for (const e of etapas) {
    if (e.perdidos > 0 && (etapaMaisPerdas === null || e.perdidos > etapaMaisPerdas.quantidade)) {
      etapaMaisPerdas = { nome: e.nome, quantidade: e.perdidos }
    }
  }

  // tempo médio de ciclo: entrada na etapa 1 → entrada na etapa 7 (mesmo negócio),
  // para negócios com as duas entradas no período
  const ciclosDias: number[] = []
  for (const lista of linhaDoTempo.values()) {
    const primeiraEntrada = lista.find((l) => l.ordem === 1)
    const ultimaEntrada = lista.find((l) => l.ordem === 7)
    if (!primeiraEntrada || !ultimaEntrada) continue
    if (
      !dentroDoPeriodo(primeiraEntrada.created, de, ate) ||
      !dentroDoPeriodo(ultimaEntrada.created, de, ate)
    )
      continue
    const dias = (instante(ultimaEntrada.created) - instante(primeiraEntrada.created)) / 86400000
    if (Number.isFinite(dias) && dias >= 0) ciclosDias.push(dias)
  }
  const tempoMedioCicloDias =
    ciclosDias.length > 0 ? ciclosDias.reduce((s, d) => s + d, 0) / ciclosDias.length : null

  // conversão total: etapa 7 ÷ etapa 1 (ordens oficiais do funil)
  const primeira = atingiram.get(1)?.size || 0
  const ultima = atingiram.get(7)?.size || 0

  return {
    dataDe: de || undefined,
    dataAte: ate || undefined,
    etapas,
    conversaoTotal: percentual(ultima, primeira),
    tempoMedioCicloDias,
    gargalo,
    etapaMaisPerdas,
  }
}
