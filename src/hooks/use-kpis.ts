import { useCallback, useEffect, useState } from 'react'
import { calcularKpis, KpisEntrada, KpisPeriodo } from '@/services/kpis'

// Hook de consumo do motor central de KPIs (src/services/kpis.ts).
// Devolve os cinco KPIs da unidade de serviços para o período informado
// (dataDe/dataAte, ou ano [+ mes]), cada um com realizado, meta, diferença e
// atingimento. `loading` cobre a primeira carga e trocas de período.
export function useKpis(entrada: KpisEntrada = {}) {
  const [dados, setDados] = useState<KpisPeriodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // serializado para não reexecutar a cada render do chamador
  const chave = JSON.stringify(entrada)

  const recarregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      setDados(await calcularKpis(JSON.parse(chave) as KpisEntrada))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao calcular os KPIs.')
    } finally {
      setLoading(false)
    }
  }, [chave])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { dados, loading, erro, recarregar }
}
