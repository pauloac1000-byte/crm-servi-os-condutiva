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
import { createContact, updateContact } from '@/services/contacts'
import { Contact } from '@/types/crm'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactToEdit?: Contact | null
  onSuccess: () => void
}

export function ContactModal({ open, onOpenChange, contactToEdit, onSuccess }: ContactModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<'lead' | 'prospect' | 'cliente' | 'inativo'>('lead')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (contactToEdit) {
      setName(contactToEdit.name || '')
      setEmail(contactToEdit.email || '')
      setPhone(contactToEdit.phone || '')
      setCompany(contactToEdit.company || '')
      setRole(contactToEdit.role || '')
      setStatus(contactToEdit.status || 'lead')
      setNotes(contactToEdit.notes || '')
    } else {
      setName('')
      setEmail('')
      setPhone('')
      setCompany('')
      setRole('')
      setStatus('lead')
      setNotes('')
    }
    setErrors({})
  }, [contactToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const payload: Partial<Contact> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        role: role.trim(),
        status,
        notes: notes.trim(),
      }

      if (contactToEdit) {
        await updateContact(contactToEdit.id, payload)
        toast.success('Contato atualizado com sucesso!')
      } else {
        await createContact(payload)
        toast.success('Contato criado com sucesso!')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      } else {
        toast.error('Erro ao salvar contato.')
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
            {contactToEdit ? 'Editar Contato' : 'Novo Contato'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700 font-semibold text-xs">
              Nome Completo *
            </Label>
            <Input
              id="name"
              placeholder="Ex: Carlos Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-semibold text-xs">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="carlos@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-slate-700 font-semibold text-xs">
                Telefone
              </Label>
              <Input
                id="phone"
                placeholder="(11) 98888-7777"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-slate-700 font-semibold text-xs">
                Empresa
              </Label>
              <Input
                id="company"
                placeholder="Empresa S.A."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-slate-700 font-semibold text-xs">
                Cargo
              </Label>
              <Input
                id="role"
                placeholder="Ex: Gerente de TI"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-slate-700 font-semibold text-xs">
              Status do CRM
            </Label>
            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-slate-700 font-semibold text-xs">
              Observações
            </Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Anotações sobre preferências, histórico de reuniões..."
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
              {loading ? 'Salvando...' : contactToEdit ? 'Atualizar' : 'Criar Contato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
