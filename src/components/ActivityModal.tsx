import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createActivity, updateActivity } from '@/services/activities'
import { Activity, Contact, Deal } from '@/types/crm'
import { toast } from 'sonner'

interface ActivityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  deals: Deal[]
  activityToEdit?: Activity | null
  defaultContactId?: string
  defaultDealId?: string
  onSuccess: () => void
}

export function ActivityModal({
  open,
  onOpenChange,
  contacts,
  deals,
  activityToEdit,
  defaultContactId,
  defaultDealId,
  onSuccess,
}: ActivityModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'ligação' | 'e-mail' | 'reunião' | 'follow-up'>('follow-up')
  const [status, setStatus] = useState<'pendente' | 'concluída'>('pendente')
  const [dueDate, setDueDate] = useState('')
  const [contactId, setContactId] = useState('')
  const [dealId, setDealId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activityToEdit) {
      setTitle(activityToEdit.title || '')
      setType(activityToEdit.type || 'follow-up')
      setStatus(activityToEdit.status || 'pendente')
      setDueDate(activityToEdit.due_date ? activityToEdit.due_date.split(' ')[0] : '')
      setContactId(activityToEdit.contact || '')
      setDealId(activityToEdit.deal || '')
      setDescription(activityToEdit.description || '')
    } else {
      setTitle('')
      setType('follow-up')
      setStatus('pendente')
      setDueDate('')
      setContactId(defaultContactId || '')
      setDealId(defaultDealId || '')
      setDescription('')
    }
  }, [activityToEdit, open, defaultContactId, defaultDealId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: Partial<Activity> = {
        title: title.trim(),
        type,
        status,
        due_date: dueDate ? `${dueDate} 00:00:00.000Z` : undefined,
        contact: contactId || undefined,
        deal: dealId || undefined,
        description: description.trim(),
      }

      if (activityToEdit) {
        await updateActivity(activityToEdit.id, payload)
        toast.success('Atividade atualizada com sucesso!')
      } else {
        await createActivity(payload)
        toast.success('Atividade agendada com sucesso!')
      }

      onSuccess()
      onOpenChange(false)
    } catch (_) {
      toast.error('Erro ao salvar atividade.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {activityToEdit ? 'Editar Atividade' : 'Nova Atividade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-slate-700 font-semibold text-xs">
              Título da Atividade *
            </Label>
            <Input
              id="title"
              placeholder="Ex: Reunião de alinhamento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-slate-700 font-semibold text-xs">
                Tipo
              </Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ligação">Ligação</SelectItem>
                  <SelectItem value="e-mail">E-mail</SelectItem>
                  <SelectItem value="reunião">Reunião</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date" className="text-slate-700 font-semibold text-xs">
                Data de Vencimento
              </Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="act_contact" className="text-slate-700 font-semibold text-xs">
                Contato Vinculado
              </Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger id="act_contact">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="act_deal" className="text-slate-700 font-semibold text-xs">
                Negócio Vinculado
              </Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger id="act_deal">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-slate-700 font-semibold text-xs">
              Descrição / Pauta
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Assuntos a serem abordados..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
            >
              {loading ? 'Salvando...' : activityToEdit ? 'Atualizar' : 'Agendar Atividade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
