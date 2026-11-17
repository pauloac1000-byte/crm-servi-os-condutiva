import { useCallback, useEffect, useState } from 'react'
import {
  calcularCustoAquisicao,
  CustoAquisicaoEntrada,
  CustoAquisicaoPeriodo,
} from '@/services/custo-aquisicao'

// Hook de consumo do motor central de custo de aquisição
// (src/services/custo-aquisicao.ts). `loading` cobre a primeira carga e trocas
// de período — mesmo padrão do hook useKpis (src/hooks/use-kpis.ts).
export function useCustoAquisicao(entrada: CustoAquisicaoEntrada) {
  const [dados, setDados] = useState<CustoAquisicaoPeriodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // serializado para não reexecutar a cada render do chamador
  const chave = JSON.stringify(entrada)

  const recarregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      setDados(await calcularCustoAquisicao(JSON.parse(chave) as CustoAquisicaoEntrada))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao calcular o custo de aquisição.')
    } finally {
      setLoading(false)
    }
  }, [chave])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { dados, loading, erro, recarregar }
}
