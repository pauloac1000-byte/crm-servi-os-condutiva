import { VisitaComercial } from '@/types/crm'
import { Car, Clock } from 'lucide-react'

interface VisitasBlocoProps {
  visitas: VisitaComercial[]
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

// Bloco compartilhado das telas de negócio e de contato: lista as visitas
// vinculadas e o custo acumulado (soma dos custo_total).
export function VisitasBloco({ visitas }: VisitasBlocoProps) {
  const custoAcumulado = visitas.reduce((soma, v) => soma + (v.custo_total || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Visitas Comerciais ({visitas.length})
        </h4>
        <span className="text-xs font-black text-teal-700">
          Custo acumulado: {formatCurrency(custoAcumulado)}
        </span>
      </div>

      {visitas.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">Nenhuma visita comercial vinculada.</p>
      ) : (
        <div className="space-y-2">
          {visitas.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-full bg-teal-50 text-teal-700 shrink-0">
                  <Car className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 capitalize">{v.tipo}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    {v.data && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(v.data).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {!!v.km_rodados && <span>{v.km_rodados} km</span>}
                    {!!v.horas_dedicadas && <span>{v.horas_dedicadas} h</span>}
                    {v.expand?.responsavel?.name && <span>{v.expand.responsavel.name}</span>}
                  </div>
                  {v.resultado && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{v.resultado}</p>
                  )}
                </div>
              </div>
              <span className="text-xs font-black text-teal-700 shrink-0">
                {formatCurrency(v.custo_total || 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
