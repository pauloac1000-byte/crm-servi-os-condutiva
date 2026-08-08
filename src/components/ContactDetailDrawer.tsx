import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Contact, Deal, Activity, PipelineStage } from '@/types/crm'
import { getDeals } from '@/services/deals'
import { getActivities } from '@/services/activities'
import { getPipelineStages } from '@/services/pipeline_stages'
import { Mail, Phone, Building, Briefcase, Plus, PlusCircle, CheckCircle2 } from 'lucide-react'
import { DealModal } from '@/components/DealModal'
import { ActivityModal } from '@/components/ActivityModal'

interface ContactDetailDrawerProps {
  contact: Contact | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function ContactDetailDrawer({
  contact,
  open,
  onClose,
  onUpdated,
}: ContactDetailDrawerProps) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [newDealOpen, setNewDealOpen] = useState(false)
  const [newActivityOpen, setNewActivityOpen] = useState(false)

  const loadData = async () => {
    if (!contact) return
    try {
      const [allDeals, allActivities, allStages] = await Promise.all([
        getDeals(),
        getActivities(),
        getPipelineStages(),
      ])
      setDeals(allDeals.filter((d) => d.contact === contact.id))
      setActivities(allActivities.filter((a) => a.contact === contact.id))
      setStages(allStages)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    if (open && contact) {
      loadData()
    }
  }, [open, contact])

  if (!contact) return null

  const statusColors: Record<string, string> = {
    cliente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    prospect: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    lead: 'bg-amber-50 text-amber-700 border-amber-200',
    inativo: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 bg-slate-50">
        <SheetHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={statusColors[contact.status] || ''}>
              {contact.status.toUpperCase()}
            </Badge>
          </div>
          <SheetTitle className="text-xl font-bold text-slate-900 leading-tight">
            {contact.name}
          </SheetTitle>
          {contact.role && <p className="text-xs text-slate-500">{contact.role}</p>}
        </SheetHeader>

        <div className="space-y-6 pt-6">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3 text-sm">
            {contact.company && (
              <div className="flex items-center gap-2.5 text-slate-700">
                <Building className="h-4 w-4 text-teal-600 shrink-0" />
                <span className="font-semibold">{contact.company}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2.5 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <a href={`mailto:${contact.email}`} className="hover:underline text-teal-700">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2.5 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.notes && (
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 italic">
                "{contact.notes}"
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5 font-semibold"
              onClick={() => setNewDealOpen(true)}
            >
              <PlusCircle className="h-4 w-4" /> Novo Negócio
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-xs gap-1.5 border-slate-300 text-slate-700"
              onClick={() => setNewActivityOpen(true)}
            >
              <Plus className="h-4 w-4" /> Nova Atividade
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Negócios Vincuados ({deals.length})
            </h4>
            {deals.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Nenhum negócio associado a este contato.
              </p>
            ) : (
              <div className="space-y-2">
                {deals.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{d.title}</p>
                      <p className="text-xs text-teal-700 font-bold">{formatCurrency(d.value)}</p>
                    </div>
                    {d.expand?.stage && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${d.expand.stage.color}15`,
                          color: d.expand.stage.color,
                        }}
                      >
                        {d.expand.stage.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Atividades do Contato ({activities.length})
            </h4>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhuma atividade registrada.</p>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3"
                  >
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${act.status === 'concluída' ? 'text-emerald-500' : 'text-slate-300'}`}
                    />
                    <div className="truncate">
                      <p className="text-xs font-medium text-slate-800 truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {act.type} •{' '}
                        {act.due_date
                          ? new Date(act.due_date).toLocaleDateString('pt-BR')
                          : 'Sem data'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DealModal
          open={newDealOpen}
          onOpenChange={setNewDealOpen}
          stages={stages}
          contacts={[contact]}
          defaultContactId={contact.id}
          onSuccess={() => {
            loadData()
            onUpdated()
          }}
        />

        <ActivityModal
          open={newActivityOpen}
          onOpenChange={setNewActivityOpen}
          contacts={[contact]}
          deals={deals}
          defaultContactId={contact.id}
          onSuccess={() => {
            loadData()
            onUpdated()
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
