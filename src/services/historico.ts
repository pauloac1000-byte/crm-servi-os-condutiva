import pb from '@/lib/pocketbase/client'
import { HistoricoNegocio } from '@/types/crm'

const EXPAND = 'etapa_de,etapa_para,owner'

// Histórico do negócio (coleção historico_negocios no Skip Cloud)
export const getHistorico = async (dealId: string): Promise<HistoricoNegocio[]> => {
  return pb.collection('historico_negocios').getFullList<HistoricoNegocio>({
    filter: `deal = '${dealId}'`,
    sort: '-created',
    expand: EXPAND,
  })
}

export const createHistorico = async (
  data: Partial<HistoricoNegocio>,
): Promise<HistoricoNegocio> => {
  return pb.collection('historico_negocios').create<HistoricoNegocio>(
    {
      ...data,
      owner: pb.authStore.record?.id,
    },
    { expand: EXPAND },
  )
}
