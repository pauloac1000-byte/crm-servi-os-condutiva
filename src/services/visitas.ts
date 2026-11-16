import pb from '@/lib/pocketbase/client'
import { VisitaComercial } from '@/types/crm'

const EXPAND = 'contato,negocio,responsavel'

export const getVisitas = async (): Promise<VisitaComercial[]> => {
  return pb.collection('visitas_comerciais').getFullList<VisitaComercial>({
    sort: '-data,-created',
    expand: EXPAND,
  })
}

export const getVisita = async (id: string): Promise<VisitaComercial> => {
  return pb.collection('visitas_comerciais').getOne<VisitaComercial>(id, {
    expand: EXPAND,
  })
}

export const createVisita = async (data: Partial<VisitaComercial>): Promise<VisitaComercial> => {
  return pb.collection('visitas_comerciais').create<VisitaComercial>(
    {
      ...data,
      responsavel: data.responsavel || pb.authStore.record?.id,
    },
    { expand: EXPAND },
  )
}

export const updateVisita = async (
  id: string,
  data: Partial<VisitaComercial>,
): Promise<VisitaComercial> => {
  return pb.collection('visitas_comerciais').update<VisitaComercial>(id, data, {
    expand: EXPAND,
  })
}

export const deleteVisita = async (id: string): Promise<boolean> => {
  return pb.collection('visitas_comerciais').delete(id)
}
