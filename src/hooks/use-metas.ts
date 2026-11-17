import { useCallback, useEffect, useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { getMetas, createMeta, updateMeta } from '@/services/metas'
import { Meta, MetaKpi } from '@/types/crm'
import { toast } from 'sonner'

// KPIs da grade, na ordem em que aparecem nas linhas
export const KPIS: {
  kpi: MetaKpi
  rotulo: string
  formato: 'percentual' | 'moeda' | 'contagem'
}[] = [
  { kpi: 'RCS', rotulo: 'RCS (Receita de Serviços)', formato: 'percentual' },
  { kpi: 'taxa_conversao_leads', rotulo: 'Taxa de conversão de leads', formato: 'percentual' },
  { kpi: 'ticket_medio', rotulo: 'Ticket médio', formato: 'moeda' },
  { kpi: 'os_no_prazo', rotulo: 'OS no prazo', formato: 'percentual' },
  { kpi: 'NRR', rotulo: 'NRR (Net Revenue Retention)', formato: 'percentual' },
  { kpi: 'leads_qualificados', rotulo: 'Leads qualificados', formato: 'contagem' },
  { kpi: 'propostas_enviadas', rotulo: 'Propostas enviadas', formato: 'contagem' },
  { kpi: 'custo_por_contrato', rotulo: 'Custo por contrato', formato: 'moeda' },
]

export const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

const CHAVE_UNICA = (ano: number, kpi: MetaKpi, mes: number) => `${ano}|${kpi}|${mes}`

export function useMetas() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [ano, setAno] = useState(new Date().getFullYear())
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const lista = await getMetas(ano)
      setMetas(lista)
    } catch {
      /* mantém o que tem */
    } finally {
      setLoading(false)
    }
  }, [ano])

  useEffect(() => {
    loadData()
  }, [loadData])

  // mapa: "ano|kpi|mes" (mes 0 = anual) → Meta
  const mapa = useMemo(() => {
    const m = new Map<string, Meta>()
    metas.forEach((meta) => m.set(CHAVE_UNICA(meta.ano, meta.kpi, meta.mes || 0), meta))
    return m
  }, [metas])

  const getMeta = useCallback(
    (kpi: MetaKpi, mes: number): Meta | undefined => mapa.get(CHAVE_UNICA(ano, kpi, mes)),
    [mapa, ano],
  )

  const getValor = useCallback(
    (kpi: MetaKpi, mes: number): number | undefined => {
      const v = getMeta(kpi, mes)?.valor_meta
      return typeof v === 'number' ? v : undefined
    },
    [getMeta],
  )

  // grava a célula (cria ou atualiza o registro do ano+mês+kpi)
  const salvarValor = useCallback(
    async (kpi: MetaKpi, mes: number, valor: number | undefined) => {
      const existente = getMeta(kpi, mes)
      try {
        if (valor === undefined) {
          if (!existente) return
          await pb.collection('metas').delete(existente.id)
        } else if (existente) {
          await updateMeta(existente.id, { valor_meta: valor })
        } else {
          await createMeta({ ano, kpi, mes: mes > 0 ? mes : 0, valor_meta: valor })
        }
      } catch (erro: any) {
        const msg =
          erro?.status === 403
            ? 'Apenas o administrador pode editar as metas.'
            : 'Erro ao salvar a meta.'
        toast.error(msg)
        throw erro
      }
    },
    [getMeta, ano],
  )

  return { ano, setAno, getValor, salvarValor, isAdmin, loading }
}

// Aviso de divergência: soma dos 12 meses × meta anual informada
export const divergenciaAnual = (meses: (number | undefined)[], anual: number | number[]) => {
  const valorAnual = Array.isArray(anual) ? anual[0] : anual
  if (valorAnual === undefined) return false
  const soma = meses.reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : 0), 0)
  return Math.abs(soma - valorAnual) > 0.005
}
