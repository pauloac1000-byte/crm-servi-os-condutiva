import { Clock } from 'lucide-react'
import { Deal, EtapaFunil } from '@/types/crm'
import { diasNaEtapa, prazoUltrapassado } from '@/lib/dias-na-etapa'

interface IndicadorEtapaProps {
  deal: Deal
  etapa?: EtapaFunil
}

// "Nesta etapa há X dias" — âmbar quando X ultrapassa o prazo_alvo_dias da
// etapa. Não aparece quando não há data de entrada nem para negócios
// ganhos/perdidos (evitar alarme falso).
export function IndicadorEtapa({ deal, etapa }: IndicadorEtapaProps) {
  if (deal.status === 'ganho' || deal.status === 'perdido') return null
  const dias = diasNaEtapa(deal)
  if (dias === null) return null

  const atrasado = prazoUltrapassado(deal, etapa)
  return (
    <span
      className={
        atrasado
          ? 'inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-full px-1.5 py-0.5'
          : 'inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500'
      }
    >
      <Clock className="h-3 w-3" />
      Nesta etapa há {dias} {dias === 1 ? 'dia' : 'dias'}
    </span>
  )
}
