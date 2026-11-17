import pb from '@/lib/pocketbase/client'
import { MovimentoReceita } from '@/types/crm'

const EXPAND = 'contrato,contrato.cliente,contrato.negocio,responsavel'

export const getMovimentosReceita = async (): Promise<MovimentoReceita[]> => {
  return pb.collection('movimentos_receita').getFullList<MovimentoReceita>({
    sort: '-competencia,-created',
    expand: EXPAND,
  })
}

export const createMovimentoReceita = async (
  data: Partial<MovimentoReceita>,
): Promise<MovimentoReceita> => {
  return pb.collection('movimentos_receita').create<MovimentoReceita>(
    {
      ...data,
      responsavel: data.responsavel || pb.authStore.record?.id,
    },
    { expand: EXPAND },
  )
}

export const deleteMovimentoReceita = async (id: string): Promise<boolean> => {
  return pb.collection('movimentos_receita').delete(id)
}

// Consolidação da receita recorrente por competência (AAAA-MM): soma dos
// movimentos de cada mês, mais recente primeiro.
export interface ReceitaPorCompetencia {
  competencia: string
  total: number
  movimentos: MovimentoReceita[]
}

export const consolidarPorCompetencia = (
  movimentos: MovimentoReceita[],
): ReceitaPorCompetencia[] => {
  const mapa = new Map<string, ReceitaPorCompetencia>()
  for (const mov of movimentos) {
    const comp = mov.competencia || '—'
    const atual = mapa.get(comp) || { competencia: comp, total: 0, movimentos: [] }
    atual.total += mov.valor_mensal || 0
    atual.movimentos.push(mov)
    mapa.set(comp, atual)
  }
  // Mais recente primeiro; "—" (sem competência) vai para o fim.
  return Array.from(mapa.values()).sort((a, b) => {
    if (a.competencia === '—') return 1
    if (b.competencia === '—') return -1
    return b.competencia.localeCompare(a.competencia)
  })
}
