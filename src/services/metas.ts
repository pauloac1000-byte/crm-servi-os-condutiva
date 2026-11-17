import pb from '@/lib/pocketbase/client'
import { Meta } from '@/types/crm'

// Metas mensais e anuais dos KPIs (coleção "metas" no Skip Cloud).
// Leitura para qualquer usuário autenticado; gravação apenas admin
// (regras da coleção + hook metas_rules.pb.js).
export const getMetas = async (ano: number): Promise<Meta[]> => {
  return pb.collection('metas').getFullList<Meta>({
    filter: `ano = ${ano}`,
    sort: 'kpi,mes',
  })
}

export const createMeta = async (data: Partial<Meta>): Promise<Meta> => {
  return pb.collection('metas').create<Meta>(data)
}

export const updateMeta = async (id: string, data: Partial<Meta>): Promise<Meta> => {
  return pb.collection('metas').update<Meta>(id, data)
}

export const deleteMeta = async (id: string): Promise<boolean> => {
  return pb.collection('metas').delete(id)
}
