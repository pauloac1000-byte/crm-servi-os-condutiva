import pb from '@/lib/pocketbase/client'

// Plano de serviço oficial da Condutiva (coleção "planos" no Skip Cloud).
export interface Plano {
  id: string
  nome: string
  descricao?: string
  valor_mensal_referencia?: number
  escopo?: string
  created?: string
  updated?: string
}

export const getPlanos = async (): Promise<Plano[]> => {
  return pb.collection('planos').getFullList<Plano>({
    sort: 'created',
  })
}
