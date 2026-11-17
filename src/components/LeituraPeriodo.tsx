import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquareText } from 'lucide-react'
import { useKpis } from '@/hooks/use-kpis'
import { useFunil } from '@/hooks/use-funil'
import { useCustoAquisicao } from '@/hooks/use-custo-aquisicao'
import { LeituraEntrada, montarLeituraPeriodo, periodoAnterior } from '@/services/leitura-periodo'

// Bloco "Leitura do período" — primeira coisa do Dashboard, acima da faixa de
// KPIs. Somente leitura: nenhuma coleção nova, nenhuma gravação, sem dados de
// exemplo. As frases vêm do serviço src/services/leitura-periodo.ts, que
// consome os motores já existentes (kpis.ts, funil.ts, custo-aquisicao.ts) —
// nenhum cálculo duplicado. Período e responsável vêm do FILTRO GLOBAL do
// Dashboard (estado elevado em src/pages/Index.tsx), então as frases mudam ao
// trocar período ou responsável na barra de filtros.
export function LeituraPeriodo({ entrada }: { entrada: LeituraEntrada }) {
  // período anterior imediato, de MESMA duração (para a variação do custo)
  const anterior = useMemo(
    () => periodoAnterior(entrada.dataDe, entrada.dataAte),
    [entrada.dataDe, entrada.dataAte],
  )

  const { dados: kpis } = useKpis(entrada)
  const { dados: funil } = useFunil({
    dataDe: entrada.dataDe,
    dataAte: entrada.dataAte,
    responsavel: entrada.responsavel,
  })
  const { dados: custoAtual } = useCustoAquisicao({
    dataDe: entrada.dataDe,
    dataAte: entrada.dataAte,
    responsavel: entrada.responsavel,
  })
  const { dados: custoAnterior } = useCustoAquisicao({
    dataDe: anterior.dataDe,
    dataAte: anterior.dataAte,
    responsavel: entrada.responsavel,
  })

  const frases = useMemo(
    () =>
      montarLeituraPeriodo({
        kpis,
        funil,
        custoAtual,
        custoAnterior,
      }),
    [kpis, funil, custoAtual, custoAnterior],
  )

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm rounded-2xl">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-teal-700 shrink-0" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Leitura do período
          </h3>
        </div>
        {frases.length === 0 ? (
          <p className="text-sm text-slate-500 font-medium">sem dados suficientes no período</p>
        ) : (
          <ul className="space-y-2">
            {frases.map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                {/* uma linha só: sem quebra, com reticências quando não couber */}
                <span className="text-sm text-slate-700 font-medium truncate">{f.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
