import { useCallback, useEffect, useState } from 'react'
import { calcularMrrNrr, MrrNrrEntrada, MrrNrrPeriodo } from '@/services/mrr-nrr'

// Hook de consumo do motor central de receita recorrente (MRR/NRR)
// (src/services/mrr-nrr.ts). `loading` cobre a primeira carga e trocas de
// período — mesmo padrão do hook useCustoAquisicao (src/hooks/use-custo-aquisicao.ts).
export function useMrrNrr(entrada: MrrNrrEntrada) {
  const [dados, setDados] = useState<MrrNrrPeriodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // serializado para não reexecutar a cada render do chamador
  const chave = JSON.stringify(entrada)

  const recarregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      setDados(await calcularMrrNrr(JSON.parse(chave) as MrrNrrEntrada))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao calcular a receita recorrente.')
    } finally {
      setLoading(false)
    }
  }, [chave])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { dados, loading, erro, recarregar }
}
