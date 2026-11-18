import { useEffect, useState } from 'react'
import { HistoricoNegocio, Deal } from '@/types/crm'
import { getHistorico } from '@/services/historico'
import { Badge } from '@/components/ui/badge'
import { History, ShieldAlert } from 'lucide-react'

interface HistoricoBlocoProps {
  deal: Deal
  refreshKey: number
}

// Histórico do negócio: avanços, avanços forçados pelo admin (com justificativa), etc.
export function HistoricoBloco({ deal, refreshKey }: HistoricoBlocoProps) {
  const [entradas, setEntradas] = useState<HistoricoNegocio[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    const load = async () => {
      try {
        const h = await getHistorico(deal.id)
        if (!cancelado) setEntradas(h)
      } catch {
        /* intentionally ignored */
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    load()
    return () => {
      cancelado = true
    }
  }, [deal.id, refreshKey])

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" /> Histórico do lead
      </h4>
      {carregando ? (
        <p className="text-xs text-slate-400 italic">Carregando histórico…</p>
      ) : entradas.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Nenhum evento registrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {entradas.map((h) => (
            <div
              key={h.id}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">{h.titulo}</span>
                {h.tipo === 'avanco_forcado' && (
                  <Badge
                    variant="outline"
                    className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] gap-1 shrink-0"
                  >
                    <ShieldAlert className="h-3 w-3" /> forçado pelo admin
                  </Badge>
                )}
              </div>
              {h.descricao && (
                <p className="text-[11px] text-slate-500 leading-relaxed">{h.descricao}</p>
              )}
              {h.justificativa && (
                <p className="text-[11px] text-slate-700 bg-amber-50 border border-amber-100 rounded-md p-2 leading-relaxed">
                  <span className="font-semibold">Justificativa: </span>
                  {h.justificativa}
                </p>
              )}
              <p className="text-[10px] text-slate-400">
                {new Date(h.created).toLocaleString('pt-BR')}
                {h.expand?.owner?.name ? ` • ${h.expand.owner.name}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
