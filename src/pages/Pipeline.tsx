import { useState, useEffect } from 'react'
import { getPipelineStages } from '@/services/pipeline_stages'
import { getDeals, updateDeal } from '@/services/deals'
import { getContacts } from '@/services/contacts'
import { PipelineStage, Deal, Contact } from '@/types/crm'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MoreVertical, Calendar, User, DollarSign } from 'lucide-react'
import { DealModal } from '@/components/DealModal'
import { DealDetailDrawer } from '@/components/DealDetailDrawer'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Pipeline() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [selectedStageForNew, setSelectedStageForNew] = useState<string>('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)

  const loadPipelineData = async () => {
    try {
      const [s, d, c] = await Promise.all([getPipelineStages(), getDeals(), getContacts()])
      setStages(s)
      setDeals(d)
      setContacts(c)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadPipelineData()
  }, [])

  useRealtime('deals', () => loadPipelineData())

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val)

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId)
    e.dataTransfer.setData('text/plain', dealId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId
    if (!dealId) return

    const currentDeal = deals.find((d) => d.id === dealId)
    if (!currentDeal || currentDeal.stage === targetStageId) return

    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: targetStageId } : d)))

    try {
      await updateDeal(dealId, { stage: targetStageId })
      toast.success('Etapa do negócio atualizada!')
    } catch (_) {
      toast.error('Erro ao atualizar etapa.')
      loadPipelineData()
    } finally {
      setDraggedDealId(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pipeline de Vendas</h2>
          <p className="text-sm text-slate-500">
            Arraste os cards para mover o negócio entre as etapas
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedStageForNew(stages[0]?.id || '')
            setDealModalOpen(true)
          }}
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo Negócio
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 items-start min-h-[calc(100vh-220px)]">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.id)
          const stageTotal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className="w-80 shrink-0 rounded-2xl bg-slate-100/80 p-3 border border-slate-200/80 flex flex-col max-h-[calc(100vh-230px)]"
            >
              <div className="p-2 pb-3 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="font-bold text-slate-800 text-sm">{stage.name}</span>
                  <Badge
                    variant="secondary"
                    className="bg-slate-200 text-slate-700 text-[10px] px-1.5 font-bold"
                  >
                    {stageDeals.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
                  onClick={() => {
                    setSelectedStageForNew(stage.id)
                    setDealModalOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right px-1">
                Total: <span className="text-slate-900">{formatCurrency(stageTotal)}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal.id)}
                    onClick={() => setSelectedDeal(deal)}
                    className="cursor-pointer border-slate-200/80 bg-white hover:border-teal-600/50 hover:shadow-md transition-all rounded-xl p-3.5 space-y-2 relative group"
                    style={{ borderLeftWidth: '4px', borderLeftColor: stage.color }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                        {deal.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={
                          deal.priority === 'alta'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px] px-1'
                            : deal.priority === 'média'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1'
                              : 'bg-slate-50 text-slate-600 border-slate-200 text-[10px] px-1'
                        }
                      >
                        {deal.priority}
                      </Badge>
                    </div>

                    {deal.expand?.contact && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="truncate">{deal.expand.contact.name}</span>
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-teal-700">
                        {formatCurrency(deal.value)}
                      </span>
                      {deal.expected_close_date && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(deal.expected_close_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <DealModal
        open={dealModalOpen}
        onOpenChange={setDealModalOpen}
        stages={stages}
        contacts={contacts}
        defaultStageId={selectedStageForNew}
        onSuccess={loadPipelineData}
      />

      <DealDetailDrawer
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onUpdated={loadPipelineData}
      />
    </div>
  )
}
