import pb from '@/lib/pocketbase/client'
import { OrdemServico } from '@/types/crm'

const EXPAND = 'cliente,contrato,responsavel_tecnico'

// filter: filtro PocketBase opcional (ex.: cliente='id' ou contrato='id')
export const getOrdensServico = async (filter?: string): Promise<OrdemServico[]> => {
  return pb.collection('ordens_servico').getFullList<OrdemServico>({
    sort: '-data_abertura,-created',
    expand: EXPAND,
    ...(filter ? { filter } : {}),
  })
}

export const createOrdemServico = async (data: Partial<OrdemServico>): Promise<OrdemServico> => {
  return pb.collection('ordens_servico').create<OrdemServico>(data, { expand: EXPAND })
}

export const updateOrdemServico = async (
  id: string,
  data: Partial<OrdemServico>,
): Promise<OrdemServico> => {
  return pb.collection('ordens_servico').update<OrdemServico>(id, data, { expand: EXPAND })
}

export const deleteOrdemServico = async (id: string): Promise<boolean> => {
  return pb.collection('ordens_servico').delete(id)
}
