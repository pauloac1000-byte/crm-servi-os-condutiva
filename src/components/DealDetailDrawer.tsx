import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Deal, Activity } from '@/types/crm'
import { getActivities, toggleActivityStatus } from '@/services/activities'
import {
  Briefcase,
  Building,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Plus,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react'
import { ActivityModal } from '@/components/ActivityModal'
import { toast } from 'sonner'

interface DealDetailDrawerProps {
  deal: Deal | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function DealDetailDrawer({ deal, open, onClose, onUpdated }: DealDetailDrawerProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [newActivityOpen, setNewActivityOpen] = useState(false)

  const loadActivities = async () => {
    if (!deal) return
    try {
      const all = await getActivities()
      setActivities(all.filter((a) => a.deal === deal.id))
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    if (open && deal) {
      loadActivities()
    }
  }, [open, deal])

  if (!deal) return null

  const contact = deal.expand?.contact
  const stage = deal.expand?.stage

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleToggleActivity = async (id: string, status: 'pendente' | 'concluída') => {
    try {
      await toggleActivityStatus(id, status)
      toast.success('Atividade atualizada!')
      loadActivities()
    } catch (_) {
      toast.error('Erro ao atualizar atividade.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 bg-slate-50">
        <SheetHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: stage?.color || '#0F766E' }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {stage?.name || 'Etapa não definida'}
            </span>
          </div>
          <SheetTitle className="text-xl font-bold text-slate-900 leading-tight">
            {deal.title}
          </SheetTitle>
          <div className="pt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700">{formatCurrency(deal.value)}</span>
            <Badge
              variant="outline"
              className={
                deal.priority === 'alta'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : deal.priority === 'média'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
              }
            >
              Prioridade {deal.priority}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 pt-6">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Contato Associado
            </h4>
            {contact ? (
              <div className="space-y-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900 text-base">{contact.name}</p>
                {contact.company && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building className="h-3.5 w-3.5" />
                    <span>
                      {contact.company} {contact.role ? `• ${contact.role}` : ''}
                    </span>
                  </div>
                )}
                {(contact.cidade || contact.estado) && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{[contact.cidade, contact.estado].filter(Boolean).join(' - ')}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{contact.phone}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhum contato vinculado.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Previsão e Notas
            </h4>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-teal-600" />
              <span>
                Fechamento em:{' '}
                {deal.expected_close_date
                  ? new Date(deal.expected_close_date).toLocaleDateString('pt-BR')
                  : 'Sem data definida'}
              </span>
            </div>
            {deal.notes && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                {deal.notes}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Atividades Vincuadas ({activities.length})
              </h4>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 text-teal-700 border-teal-200 hover:bg-teal-50"
                onClick={() => setNewActivityOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Nova
              </Button>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Nenhuma atividade agendada para este negócio.
              </p>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleActivity(act.id, act.status)}
                        className={`p-1 rounded-full transition-colors ${
                          act.status === 'concluída'
                            ? 'text-emerald-600 bg-emerald-50'
                            : 'text-slate-300 hover:text-teal-600'
                        }`}
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <div>
                        <p
                          className={`text-sm font-medium ${act.status === 'concluída' ? 'line-through text-slate-400' : 'text-slate-800'}`}
                        >
                          {act.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="capitalize">{act.type}</span>
                          {act.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(act.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <ActivityModal
          open={newActivityOpen}
          onOpenChange={setNewActivityOpen}
          contacts={contact ? [contact] : []}
          deals={[deal]}
          defaultDealId={deal.id}
          defaultContactId={contact?.id}
          onSuccess={() => {
            loadActivities()
            onUpdated()
          }}
        />
      </SheetContent>
    </Sheet>
  )
}
