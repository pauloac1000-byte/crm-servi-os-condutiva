import pb from '@/lib/pocketbase/client'
import { Deal } from '@/types/crm'

const EXPAND = 'stage,contact,owner,etapa,etapa_anterior'

export const getDeals = async (): Promise<Deal[]> => {
  return pb.collection('deals').getFullList<Deal>({
    sort: '-created',
    expand: EXPAND,
  })
}

export const getDeal = async (id: string): Promise<Deal> => {
  return pb.collection('deals').getOne<Deal>(id, {
    expand: EXPAND,
  })
}

export const createDeal = async (data: Partial<Deal>): Promise<Deal> => {
  return pb.collection('deals').create<Deal>(
    {
      ...data,
      owner: pb.authStore.record?.id,
    },
    { expand: EXPAND },
  )
}

export const updateDeal = async (id: string, data: Partial<Deal>): Promise<Deal> => {
  return pb.collection('deals').update<Deal>(id, data, {
    expand: EXPAND,
  })
}

export const deleteDeal = async (id: string): Promise<boolean> => {
  return pb.collection('deals').delete(id)
}
