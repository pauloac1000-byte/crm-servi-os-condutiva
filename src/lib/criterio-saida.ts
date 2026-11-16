import { Deal, EtapaFunil } from '@/types/crm'

// Critério de saída — itens e estado de confirmação por negócio.
// Os itens vêm de etapas_funil.criterio_itens (a etapa 3 Qualificado tem 4,
// as demais têm 1); o que foi confirmado fica em deals.criterio_marcados.

// Itens do critério de saída de uma etapa (fallback: o texto inteiro como 1 item)
export const getCriterioItens = (etapa?: EtapaFunil | null): string[] => {
  const itens = etapa?.criterio_itens
  if (Array.isArray(itens) && itens.length > 0) {
    return itens.filter((i) => typeof i === 'string' && i.trim() !== '')
  }
  if (etapa?.criterio_saida && etapa.criterio_saida.trim() !== '') {
    return [etapa.criterio_saida]
  }
  return []
}

// Itens já confirmados pelo negócio (campo json de deals)
export const getCriterioMarcados = (deal?: Deal | null): string[] => {
  const marcados = deal?.criterio_marcados
  if (!Array.isArray(marcados)) return []
  return marcados.filter((m) => typeof m === 'string')
}

export const isCriterioCumprido = (etapa?: EtapaFunil | null, deal?: Deal | null): boolean => {
  const itens = getCriterioItens(etapa)
  if (itens.length === 0) return true // etapa sem critério definido: não bloqueia
  const marcados = getCriterioMarcados(deal)
  return itens.every((item) => marcados.includes(item))
}

export const toggleCriterioItem = (deal: Deal, item: string, marcado: boolean): string[] => {
  const atual = getCriterioMarcados(deal)
  if (marcado) {
    return atual.includes(item) ? atual : [...atual, item]
  }
  return atual.filter((m) => m !== item)
}

// A etapa de destino é exatamente a seguinte na ordem do funil?
export const isProximaEtapa = (
  etapaAtual?: EtapaFunil | null,
  etapaDestino?: EtapaFunil | null,
): boolean => {
  if (!etapaAtual || !etapaDestino) return false
  return etapaDestino.ordem === etapaAtual.ordem + 1
}

// Mensagem exata exigida pelo usuário para o bloqueio
export const MSG_CRITERIO_PENDENTE =
  'Esta oportunidade ainda não cumpriu o critério de saída da etapa atual'
