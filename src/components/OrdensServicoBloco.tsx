import { Badge } from '@/components/ui/badge'
import { OrdemServico } from '@/types/crm'
import { formatarDataOS, isAtrasada, statusOsClasses } from '@/lib/ordem-servico'
import { Wrench } from 'lucide-react'

interface OrdensServicoBlocoProps {
  ordens: OrdemServico[]
}

// Lista de OS vinculadas a um contato ou contrato (usada nos drawers de detalhe)
export function OrdensServicoBloco({ ordens }: OrdensServicoBlocoProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Ordens de Serviço ({ordens.length})
      </h4>
      {ordens.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Nenhuma ordem de serviço vinculada.</p>
      ) : (
        <div className="space-y-2">
          {ordens.map((os) => (
            <div
              key={os.id}
              className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Wrench className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-slate-800 truncate">{os.descricao}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`capitalize shrink-0 ${statusOsClasses(os.status)}`}
                >
                  {os.status}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Prazo: {formatarDataOS(os.prazo_acordado)}
                {isAtrasada(os) && <span className="ml-1 font-bold text-rose-600">(atrasada)</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
