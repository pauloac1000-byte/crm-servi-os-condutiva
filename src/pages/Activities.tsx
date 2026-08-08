import { useState, useEffect } from 'react'
import { getActivities, toggleActivityStatus, deleteActivity } from '@/services/activities'
import { getContacts } from '@/services/contacts'
import { getDeals } from '@/services/deals'
import { Activity, Contact, Deal } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Users,
  Clock,
  Briefcase,
} from 'lucide-react'
import { ActivityModal } from '@/components/ActivityModal'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null)

  const loadData = async () => {
    try {
      const [a, c, d] = await Promise.all([getActivities(), getContacts(), getDeals()])
      setActivities(a)
      setContacts(c)
      setDeals(d)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('activities', () => loadData())

  const handleToggle = async (id: string, currentStatus: 'pendente' | 'concluída') => {
    try {
      await toggleActivityStatus(id, currentStatus)
      toast.success('Status da atividade alterado!')
      loadData()
    } catch (_) {
      toast.error('Erro ao alterar status.')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      try {
        await deleteActivity(id)
        toast.success('Atividade excluída!')
        loadData()
      } catch (_) {
        toast.error('Erro ao excluir atividade.')
      }
    }
  }

  const pending = activities.filter((a) => a.status === 'pendente')
  const completed = activities.filter((a) => a.status === 'concluída')

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ligação':
        return <Phone className="h-4 w-4 text-blue-600" />
      case 'e-mail':
        return <Mail className="h-4 w-4 text-purple-600" />
      case 'reunião':
        return <Users className="h-4 w-4 text-teal-600" />
      default:
        return <Clock className="h-4 w-4 text-amber-600" />
    }
  }

  const renderActivityList = (list: Activity[]) => {
    if (list.length === 0) {
      return (
        <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          Nenhuma atividade nesta categoria.
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {list.map((act) => (
          <div
            key={act.id}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-slate-300"
          >
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="sm"
                className={`mt-0.5 h-8 w-8 p-0 rounded-full shrink-0 ${
                  act.status === 'concluída'
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-slate-300 hover:text-teal-600'
                }`}
                onClick={() => handleToggle(act.id, act.status)}
              >
                <CheckCircle2 className="h-6 w-6" />
              </Button>

              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-slate-100">{getTypeIcon(act.type)}</div>
                  <h4
                    className={`text-base font-bold ${act.status === 'concluída' ? 'line-through text-slate-400' : 'text-slate-900'}`}
                  >
                    {act.title}
                  </h4>
                </div>

                {act.description && (
                  <p className="text-xs text-slate-500 mt-1">{act.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                  {act.expand?.contact && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {act.expand.contact.name}
                    </span>
                  )}
                  {act.expand?.deal && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      {act.expand.deal.title}
                    </span>
                  )}
                  {act.due_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(act.due_date).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-teal-700"
                onClick={() => {
                  setActivityToEdit(act)
                  setActivityModalOpen(true)
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                onClick={() => handleDelete(act.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Atividades & Tarefas
          </h2>
          <p className="text-sm text-slate-500">
            Agendamentos, ligações e acompanhamento de clientes
          </p>
        </div>
        <Button
          onClick={() => {
            setActivityToEdit(null)
            setActivityModalOpen(true)
          }}
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 shadow-md shadow-teal-700/20"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nova Atividade
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-slate-200/80 p-1 rounded-xl mb-4">
          <TabsTrigger value="pending" className="rounded-lg text-xs font-bold px-4">
            Pendentes ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg text-xs font-bold px-4">
            Concluídas ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">{renderActivityList(pending)}</TabsContent>
        <TabsContent value="completed">{renderActivityList(completed)}</TabsContent>
      </Tabs>

      <ActivityModal
        open={activityModalOpen}
        onOpenChange={setActivityModalOpen}
        contacts={contacts}
        deals={deals}
        activityToEdit={activityToEdit}
        onSuccess={loadData}
      />
    </div>
  )
}
