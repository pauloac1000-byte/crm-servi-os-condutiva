import { useEffect, useState } from 'react'
import {
  EficienciaComercial,
  EficienciaFiltros,
  calcularEficienciaComercial,
} from '@/services/eficiencia'

// Hook reutilizável para o dashboard e outras telas: dado um período
// (e opcionalmente um responsável), devolve os indicadores de eficiência
// comercial calculados a partir dos dados do Skip Cloud.
export function useEficienciaComercial(filtros: EficienciaFiltros) {
  const [dados, setDados] = useState<EficienciaComercial | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // serializa os filtros para não reexecutar a cada render do pai
  const chave =
    `${filtros.dataDe || ''}|${filtros.dataAte || ''}|${filtros.responsavel || ''}` +
    `|${filtros.lead || ''}|${filtros.tipo || ''}`

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    calcularEficienciaComercial({
      dataDe: filtros.dataDe,
      dataAte: filtros.dataAte,
      responsavel: filtros.responsavel,
      lead: filtros.lead,
      tipo: filtros.tipo,
    })
      .then((r) => {
        if (ativo) setDados(r)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível calcular os indicadores.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  // recalcula sob demanda (usado quando visitas/negócios mudam em tempo real)
  const recalcular = () => {
    setCarregando(true)
    setErro(null)
    calcularEficienciaComercial({
      dataDe: filtros.dataDe,
      dataAte: filtros.dataAte,
      responsavel: filtros.responsavel,
      lead: filtros.lead,
      tipo: filtros.tipo,
    })
      .then((r) => setDados(r))
      .catch(() => setErro('Não foi possível calcular os indicadores.'))
      .finally(() => setCarregando(false))
  }

  return { dados, carregando, erro, recalcular }
}
