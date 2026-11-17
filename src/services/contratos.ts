import pb from '@/lib/pocketbase/client'
import { Contrato } from '@/types/crm'

const EXPAND = 'cliente,negocio,plano,responsavel'

export const getContratos = async (): Promise<Contrato[]> => {
  return pb.collection('contratos').getFullList<Contrato>({
    sort: '-data_inicio,-created',
    expand: EXPAND,
  })
}

export const getContrato = async (id: string): Promise<Contrato> => {
  return pb.collection('contratos').getOne<Contrato>(id, {
    expand: EXPAND,
  })
}

export const createContrato = async (data: Partial<Contrato>): Promise<Contrato> => {
  return pb.collection('contratos').create<Contrato>(
    {
      ...data,
      responsavel: data.responsavel || pb.authStore.record?.id,
    },
    { expand: EXPAND },
  )
}

export const updateContrato = async (id: string, data: Partial<Contrato>): Promise<Contrato> => {
  return pb.collection('contratos').update<Contrato>(id, data, {
    expand: EXPAND,
  })
}

export const deleteContrato = async (id: string): Promise<boolean> => {
  return pb.collection('contratos').delete(id)
}
