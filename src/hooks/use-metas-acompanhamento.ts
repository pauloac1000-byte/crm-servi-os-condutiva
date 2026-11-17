import { useCallback, useEffect, useState } from 'react'
import {
  calcularMetasAcompanhamento,
  MetasAcompanhamento,
  MetasEntrada,
} from '@/services/metas-acompanhamento'

// Hook de consumo do motor central de acompanhamento de metas
// (src/services/metas-acompanhamento.ts). `loading` cobre a primeira carga e
// trocas de período — mesmo padrão do hook useCustoAquisicao
// (src/hooks/use-custo-aquisicao.ts).
export function useMetasAcompanhamento(entrada: MetasEntrada) {
  const [dados, setDados] = useState<MetasAcompanhamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // serializado para não reexecutar a cada render do chamador
  const chave = JSON.stringify(entrada)

  const recarregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      setDados(await calcularMetasAcompanhamento(JSON.parse(chave) as MetasEntrada))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao calcular o acompanhamento de metas.')
    } finally {
      setLoading(false)
    }
  }, [chave])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { dados, loading, erro, recarregar }
}
