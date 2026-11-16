import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Deal, EtapaFunil } from '@/types/crm'
import { getCriterioItens, getCriterioMarcados } from '@/lib/criterio-saida'
import { toast } from 'sonner'
import { updateDeal } from '@/services/deals'
import { useState, useEffect } from 'react'

interface CriterioSaidaBlocoProps {
  deal: Deal
  etapa: EtapaFunil | undefined
  onUpdated: () => void
}

// Bloco "Critério de saída desta etapa" — uma caixa por item
// (etapa 3 Qualificado: 4 caixas; demais etapas: 1 caixa).
export function CriterioSaidaBloco({ deal, etapa, onUpdated }: CriterioSaidaBlocoProps) {
  const [salvando, setSalvando] = useState(false)
  const [otimista, setOtimista] = useState<string[] | null>(null)

  // Re-sincroniza quando o pai traz o negócio atualizado do banco
  useEffect(() => {
    setOtimista(null)
  }, [deal.criterio_marcados, deal.etapa])

  if (!etapa) return null

  const itens = getCriterioItens(etapa)
  if (itens.length === 0) return null

  const marcados = otimista ?? getCriterioMarcados(deal)

  const handleToggle = async (item: string, checked: boolean) => {
    setSalvando(true)
    const base = otimista ?? getCriterioMarcados(deal)
    const novos = checked
      ? base.includes(item)
        ? base
        : [...base, item]
      : base.filter((m) => m !== item)
    setOtimista(novos)
    try {
      await updateDeal(deal.id, { criterio_marcados: novos })
      onUpdated()
    } catch (_) {
      setOtimista(null)
      toast.error('Erro ao salvar a confirmação do critério.')
    } finally {
      setSalvando(false)
    }
  }

  const todosMarcados = itens.every((i) => marcados.includes(i))

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Critério de saída desta etapa
        </h4>
        <Badge
          variant="outline"
          className={
            todosMarcados
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
              : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
          }
        >
          {todosMarcados
            ? 'Cumprido'
            : `${marcados.filter((m) => itens.includes(m)).length}/${itens.length} confirmados`}
        </Badge>
      </div>

      {/* Texto do critério vindo de etapas_funil */}
      {etapa.criterio_saida && (
        <p className="text-xs text-slate-500 leading-relaxed">{etapa.criterio_saida}</p>
      )}

      <div className="space-y-2">
        {itens.map((item) => (
          <label
            key={item}
            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 cursor-pointer hover:border-teal-200 transition-colors"
          >
            <Checkbox
              className="mt-0.5"
              checked={marcados.includes(item)}
              disabled={salvando}
              onCheckedChange={(checked) => handleToggle(item, checked === true)}
            />
            <span className="text-xs text-slate-700 leading-relaxed">{item}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
