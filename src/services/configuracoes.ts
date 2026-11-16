import pb from '@/lib/pocketbase/client'

// Parâmetros globais do sistema (coleção "configuracoes" — um único registro,
// editável apenas pelo admin). Leitura liberada para qualquer usuário
// autenticado: o form de visitas precisa do custo_km.
export interface Configuracoes {
  id: string
  custo_km?: number
  custo_hora_comercial?: number
  created: string
  updated: string
}

export const getConfiguracoes = async (): Promise<Configuracoes | null> => {
  const lista = await pb.collection('configuracoes').getList<Configuracoes>(1, 1)
  return lista.items[0] || null
}

export const updateConfiguracoes = async (
  id: string,
  data: Partial<Pick<Configuracoes, 'custo_km' | 'custo_hora_comercial'>>,
): Promise<Configuracoes> => {
  return pb.collection('configuracoes').update<Configuracoes>(id, data)
}
