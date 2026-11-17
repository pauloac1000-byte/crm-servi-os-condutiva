import { Deal, EtapaFunil, HistoricoNegocio, OrdemServico } from '@/types/crm'
import { situacaoPrazoOS } from '@/lib/ordem-servico'
import { diasNaEtapa } from '@/lib/dias-na-etapa'

// Regras do bloco "Precisa de ação" do Dashboard (somente leitura):
//  1. OS abertas/em execução com prazo vencido ou vencendo em até 2 dias
//     (mesma regra de situacaoPrazoOS usada na tela de Ordens de Serviço).
//  2. Negócios em andamento parados além do prazo-alvo da etapa: usa
//     etapa.prazo_alvo_dias; sem prazo cadastrado, usa o tempo médio de
//     permanência na etapa calculado do historico_negocios; sem histórico,
//     usa um tempo-alvo padrão por etapa (abaixo) — nunca exibe item sem
//     justificativa (sem etapa_desde ou sem alvo calculável = fora da lista).
//  3. Propostas enviadas sem retorno: negócios em andamento na etapa 5
//     (Proposta) há mais de 7 dias, contados de deals.etapa_desde
//     (estampada pelo hook deals_historico_etapas.pb.js).

// Tempo-alvo padrão (dias) por ordem da etapa, quando não há prazo_alvo_dias
// nem histórico suficiente para calcular o tempo médio da etapa.
const PRAZO_PADRAO_POR_ORDEM: Record<number, number> = {
  1: 7,
  2: 10,
  3: 15,
  4: 15,
  5: 15,
  6: 10,
  7: 7,
}

const DIAS_PROPOSTA_SEM_RETORNO = 7

// Tempo médio de permanência (dias) por ORDEM da etapa, calculado do
// historico_negocios (entradas em etapa), mesma regra do motor do funil
// (src/services/funil.ts): diferença entre a entrada numa etapa e a entrada
// na seguinte, do mesmo negócio. Estadias em aberto não entram na média.
export const tempoMedioPorOrdem = (
  historico: HistoricoNegocio[],
  etapas: EtapaFunil[],
): Map<number, number> => {
  const ordemPorId = new Map<string, number>()
  etapas.forEach((e) => ordemPorId.set(e.id, e.ordem))
  const instante = (d: string) => Date.parse(d.replace(' ', 'T'))
  const linhaDoTempo = new Map<string, { ordem: number; created: string }[]>()
  for (const h of historico) {
    if (h.tipo !== 'entrada_etapa') continue
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
      const dias = (instante(lista[i + 1].created) - instante(lista[i].created)) / 86400000
      if (!Number.isFinite(dias) || dias < 0) continue
      const ordem = lista[i].ordem
      const acumulado = tempos.get(ordem) || []
      acumulado.push(dias)
      tempos.set(ordem, acumulado)
    }
  }
  const medias = new Map<number, number>()
  for (const [ordem, dias] of tempos) {
    if (dias.length > 0) medias.set(ordem, dias.reduce((s, d) => s + d, 0) / dias.length)
  }
  return medias
}

export interface ItemPrecisaAcao {
  id: string
  titulo: string
  detalhe: string
  deal?: Deal
  os?: OrdemServico
}

export interface PrecisaAcaoResultado {
  osAtrasadas: ItemPrecisaAcao[]
  negociosParados: ItemPrecisaAcao[]
  propostasSemRetorno: ItemPrecisaAcao[]
}

const ordemDaEtapa = (etapas: EtapaFunil[], etapaId?: string): number | null => {
  if (!etapaId) return null
  return etapas.find((e) => e.id === etapaId)?.ordem ?? null
}

export const calcularPrecisaAcao = (
  deals: Deal[],
  etapas: EtapaFunil[],
  ordens: OrdemServico[],
  // tempo médio de permanência (dias) por ORDEM da etapa, vindo do historico_negocios
  tempoMedioPorOrdem: Map<number, number>,
): PrecisaAcaoResultado => {
  const hojeISO = () => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${dia}`
  }

  // 1. OS com prazo vencido ou vencendo em até 2 dias (aberta/em execução)
  const osAtrasadas: ItemPrecisaAcao[] = ordens
    .filter((os) => situacaoPrazoOS(os) === 'vencendo')
    .sort((a, b) => ((a.prazo_acordado || '') < (b.prazo_acordado || '') ? -1 : 1))
    .slice(0, 5)
    .map((os) => {
      const vencida = (os.prazo_acordado || '').split(' ')[0].split('T')[0] < hojeISO()
      return {
        id: os.id,
        titulo: os.expand?.cliente?.name || os.empresa || 'OS sem cliente',
        detalhe: `${vencida ? 'Vencida' : 'Vence em até 2 dias'} • ${
          (os.prazo_acordado || '').split(' ')[0].split('T')[0].split('-').reverse().join('/') ||
          'sem prazo'
        }`,
        os,
      }
    })

  // 2. Negócios parados além do prazo-alvo da etapa
  const negociosParados: ItemPrecisaAcao[] = deals
    .filter((d) => d.status !== 'ganho' && d.status !== 'perdido')
    .map((d) => {
      const dias = diasNaEtapa(d)
      const etapa = d.expand?.etapa
      const ordem = etapa?.ordem ?? null
      if (dias === null || !etapa || ordem === null) return null
      const alvo =
        (typeof etapa.prazo_alvo_dias === 'number' && etapa.prazo_alvo_dias > 0
          ? etapa.prazo_alvo_dias
          : null) ??
        tempoMedioPorOrdem.get(ordem) ??
        PRAZO_PADRAO_POR_ORDEM[ordem] ??
        null
      if (alvo === null || dias <= alvo) return null
      return { deal: d, dias, alvo } as const
    })
    .filter((x): x is { deal: Deal; dias: number; alvo: number } => x !== null)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5)
    .map(({ deal, dias, alvo }) => ({
      id: deal.id,
      titulo: deal.title,
      detalhe: `${dias} dias na etapa • alvo: ${Math.round(alvo)} dias`,
      deal,
    }))

  // 3. Propostas enviadas (etapa 5) sem retorno há mais de 7 dias
  const propostasSemRetorno: ItemPrecisaAcao[] = deals
    .filter((d) => d.status !== 'ganho' && d.status !== 'perdido')
    .map((d) => {
      const dias = diasNaEtapa(d)
      const ordem = ordemDaEtapa(etapas, d.etapa)
      if (dias === null || ordem !== 5 || dias <= DIAS_PROPOSTA_SEM_RETORNO) return null
      return { deal: d, dias } as const
    })
    .filter((x): x is { deal: Deal; dias: number } => x !== null)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5)
    .map(({ deal, dias }) => ({
      id: deal.id,
      titulo: deal.title,
      detalhe: `Sem retorno há ${dias} dias`,
      deal,
    }))

  return { osAtrasadas, negociosParados, propostasSemRetorno }
}
