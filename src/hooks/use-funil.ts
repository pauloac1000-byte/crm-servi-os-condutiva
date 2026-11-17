import { useCallback, useEffect, useState } from 'react'
import { calcularFunil, FunilEntrada, FunilPeriodo } from '@/services/funil'

// Hook de consumo do motor do funil (src/services/funil.ts).
// Devolve, para o período informado (dataDe/dataAte), as etapas com negócios
// que as atingiram, conversões, tempo médio de permanência, gargalo e perdas.
// `loading` cobre a primeira carga e trocas de período.
export function useFunil(entrada: FunilEntrada = {}) {
  const [dados, setDados] = useState<FunilPeriodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // serializado para não reexecutar a cada render do chamador
  const chave = JSON.stringify(entrada)

  const recarregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      setDados(await calcularFunil(JSON.parse(chave) as FunilEntrada))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao calcular o funil.')
    } finally {
      setLoading(false)
    }
  }, [chave])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { dados, loading, erro, recarregar }
}
