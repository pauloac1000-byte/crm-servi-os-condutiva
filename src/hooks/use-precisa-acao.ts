import { useCallback, useEffect, useState } from 'react'
import { Deal, EtapaFunil, HistoricoNegocio, OrdemServico } from '@/types/crm'
import {
  calcularPrecisaAcao,
  PrecisaAcaoResultado,
  tempoMedioPorOrdem,
} from '@/services/precisa-acao'
import { getOrdensServico } from '@/services/ordens_servico'
import { getDeals } from '@/services/deals'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

const VAZIO: PrecisaAcaoResultado = {
  osAtrasadas: [],
  negociosParados: [],
  propostasSemRetorno: [],
}

// Dados do bloco "Precisa de ação" do Dashboard (somente leitura — nada é
// gravado no banco). Carrega deals, etapas do funil, OS e o histórico de
// entradas em etapa (para o tempo médio de permanência por etapa) e aplica
// as regras do serviço precisa-acao.ts.
export function usePrecisaAcao() {
  const [dados, setDados] = useState<PrecisaAcaoResultado>(VAZIO)
  const [etapaPropostaId, setEtapaPropostaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const [deals, etapas, ordens, historico] = await Promise.all([
        getDeals(),
        pb.collection('etapas_funil').getFullList<EtapaFunil>({ sort: 'ordem' }),
        getOrdensServico(),
        pb.collection('historico_negocios').getFullList<HistoricoNegocio>({
          filter: "tipo = 'entrada_etapa'",
          sort: 'created',
        }),
      ])
      setEtapaPropostaId(etapas.find((e) => e.ordem === 5)?.id ?? null)
      setDados(calcularPrecisaAcao(deals, etapas, ordens, tempoMedioPorOrdem(historico, etapas)))
    } catch {
      setDados(VAZIO)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Mantém as listas em sincronia com o banco (mesmo padrão das demais telas)
  useRealtime('deals', () => carregar())
  useRealtime('ordens_servico', () => carregar())
  useRealtime('historico_negocios', () => carregar())

  return { dados, etapaPropostaId, loading, recarregar: carregar }
}

// Reexportado para tipagem do componente
export type { PrecisaAcaoResultado, Deal, OrdemServico }
