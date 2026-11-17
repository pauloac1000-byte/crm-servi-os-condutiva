import { useEffect, useState } from 'react'
import { getContratos } from '@/services/contratos'
import type { Contrato } from '@/types/crm'
import { useRealtime } from '@/hooks/use-realtime'

export interface MarcoValidacao {
  concluido: boolean
  contrato: Contrato | undefined
}

// Marco de validação do modelo: primeiro contrato piloto assinado com
// RCS maior que zero (existência de contrato com valor_mensal > 0).
// Recarrega ao abrir a tela e em qualquer mudança na coleção "contratos".
export const useMarcoValidacao = (): MarcoValidacao => {
  const [contrato, setContrato] = useState<Contrato | undefined>(undefined)
  const [carregado, setCarregado] = useState(false)

  const buscar = async () => {
    try {
      const lista = await getContratos()
      const achado = lista.find((c) => typeof c.valor_mensal === 'number' && c.valor_mensal > 0)
      setContrato(achado)
    } catch {
      /* mantém o estado atual */
    } finally {
      setCarregado(true)
    }
  }

  useEffect(() => {
    buscar()
  }, [])

  useRealtime(
    'contratos',
    () => {
      buscar()
    },
    carregado,
  )

  return { concluido: !!contrato, contrato }
}
