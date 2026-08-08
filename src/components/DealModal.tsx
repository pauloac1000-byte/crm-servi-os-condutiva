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
import { createDeal, updateDeal } from '@/services/deals'
import { Deal, PipelineStage, Contact } from '@/types/crm'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

interface DealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stages: PipelineStage[]
  contacts: Contact[]
  dealToEdit?: Deal | null
  defaultContactId?: string
  defaultStageId?: string
  onSuccess: () => void
}

export function DealModal({
  open,
  onOpenChange,
  stages,
  contacts,
  dealToEdit,
  defaultContactId,
  defaultStageId,
  onSuccess,
}: DealModalProps) {
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [stageId, setStageId] = useState('')
  const [contactId, setContactId] = useState('')
  const [priority, setPriority] = useState<'baixa' | 'média' | 'alta'>('média')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (dealToEdit) {
      setTitle(dealToEdit.title || '')
      setValue(dealToEdit.value ? String(dealToEdit.value) : '0')
      setStageId(dealToEdit.stage || stages[0]?.id || '')
      setContactId(dealToEdit.contact || '')
      setPriority(dealToEdit.priority || 'média')
      setExpectedCloseDate(
        dealToEdit.expected_close_date ? dealToEdit.expected_close_date.split(' ')[0] : '',
      )
      setNotes(dealToEdit.notes || '')
    } else {
      setTitle('')
      setValue('')
      setStageId(defaultStageId || stages[0]?.id || '')
      setContactId(defaultContactId || contacts[0]?.id || '')
      setPriority('média')
      setExpectedCloseDate('')
      setNotes('')
    }
    setErrors({})
  }, [dealToEdit, open, stages, contacts, defaultContactId, defaultStageId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const payload: Partial<Deal> = {
        title: title.trim(),
        value: value ? Number(value) : 0,
        stage: stageId,
        contact: contactId,
        priority,
        notes: notes.trim(),
        expected_close_date: expectedCloseDate ? `${expectedCloseDate} 00:00:00.000Z` : undefined,
      }

      if (dealToEdit) {
        await updateDeal(dealToEdit.id, payload)
        toast.success('Negócio atualizado com sucesso!')
      } else {
        await createDeal(payload)
        toast.success('Negócio criado com sucesso!')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      } else {
        toast.error('Ocorreu um erro ao salvar o negócio.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {dealToEdit ? 'Editar Negócio' : 'Novo Negócio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-slate-700 font-semibold text-xs">
              Título do Negócio *
            </Label>
            <Input
              id="title"
              placeholder="Ex: Consultoria de Arquitetura"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            {errors.title && <p className="text-xs text-rose-500">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="value" className="text-slate-700 font-semibold text-xs">
                Valor (R$)
              </Label>
              <Input
                id="value"
                type="number"
                placeholder="0.00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              {errors.value && <p className="text-xs text-rose-500">{errors.value}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority" className="text-slate-700 font-semibold text-xs">
                Prioridade
              </Label>
              <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="média">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stage" className="text-slate-700 font-semibold text-xs">
                Etapa do Pipeline
              </Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact" className="text-slate-700 font-semibold text-xs">
                Contato Vinculado
              </Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger id="contact">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expected_close_date" className="text-slate-700 font-semibold text-xs">
              Fechamento Previsto
            </Label>
            <Input
              id="expected_close_date"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-slate-700 font-semibold text-xs">
              Observações
            </Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Detalhes sobre o escopo ou expectativas do cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {loading ? 'Salvando...' : dealToEdit ? 'Atualizar' : 'Criar Negócio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
