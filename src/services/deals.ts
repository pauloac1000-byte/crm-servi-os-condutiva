import pb from '@/lib/pocketbase/client'
import { Deal } from '@/types/crm'

export const getDeals = async (): Promise<Deal[]> => {
  return pb.collection('deals').getFullList<Deal>({
    sort: '-created',
    expand: 'stage,contact,owner',
  })
}

export const getDeal = async (id: string): Promise<Deal> => {
  return pb.collection('deals').getOne<Deal>(id, {
    expand: 'stage,contact,owner',
  })
}

export const createDeal = async (data: Partial<Deal>): Promise<Deal> => {
  return pb.collection('deals').create<Deal>(
    {
      ...data,
      owner: pb.authStore.record?.id,
    },
    { expand: 'stage,contact,owner' },
  )
}

export const updateDeal = async (id: string, data: Partial<Deal>): Promise<Deal> => {
  return pb.collection('deals').update<Deal>(id, data, {
    expand: 'stage,contact,owner',
  })
}

export const deleteDeal = async (id: string): Promise<boolean> => {
  return pb.collection('deals').delete(id)
}
