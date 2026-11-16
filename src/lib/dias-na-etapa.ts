import { Deal, EtapaFunil } from '@/types/crm'

// Calcula há quantos dias completos o negócio está na etapa atual, a partir
// de deals.etapa_desde (estampada automaticamente pelo hook do backend a cada
// mudança de etapa). Sem data conhecida, retorna null (nada é exibido).
export function diasNaEtapa(deal: Deal): number | null {
  if (!deal.etapa_desde) return null
  const entrada = new Date(deal.etapa_desde)
  if (isNaN(entrada.getTime())) return null
  const msPorDia = 1000 * 60 * 60 * 24
  return Math.max(0, Math.floor((Date.now() - entrada.getTime()) / msPorDia))
}

// true quando os dias na etapa ultrapassam o prazo-alvo da etapa atual —
// usado para destacar o indicador em âmbar (evitar alarme falso: só para
// negócios em andamento, e apenas com prazo definido na etapa).
export function prazoUltrapassado(deal: Deal, etapa?: EtapaFunil): boolean {
  if (deal.status === 'ganho' || deal.status === 'perdido') return false
  const dias = diasNaEtapa(deal)
  if (dias === null) return false
  const prazo = etapa?.prazo_alvo_dias
  if (typeof prazo !== 'number' || prazo <= 0) return false
  return dias > prazo
}
