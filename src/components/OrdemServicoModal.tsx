import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Contact, Contrato, OrdemServico, OrdemServicoStatus, User } from '@/types/crm'
import { ORDEM_SERVICO_STATUS, hojeISO } from '@/lib/ordem-servico'
import { createOrdemServico, updateOrdemServico } from '@/services/ordens_servico'
import { toast } from 'sonner'

// Valor interno do select para "nenhum" (o Radix não aceita value vazio)
const NENHUM = 'none'

interface OrdemServicoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  contratos: Contrato[]
  usuarios: User[]
  osToEdit: OrdemServico | null
  onSuccess: () => void
}

interface FormState {
  cliente: string
  contrato: string
  equipamento: string
  descricao: string
  data_abertura: string
  prazo_acordado: string
  data_encerramento: string
  status: OrdemServicoStatus
  responsavel_tecnico: string
  observacoes: string
}

// Data do PocketBase ("AAAA-MM-DD HH:MM:SS.000Z") → valor do input type="date"
const dataParaInput = (d?: string) => (d ? d.split(' ')[0].split('T')[0] : '')

const formVazio = (): FormState => ({
  cliente: '',
  contrato: '',
  equipamento: '',
  descricao: '',
  data_abertura: hojeISO(),
  prazo_acordado: '',
  data_encerramento: '',
  status: 'aberta',
  responsavel_tecnico: '',
  observacoes: '',
})

export function OrdemServicoModal({
  open,
  onOpenChange,
  contacts,
  contratos,
  usuarios,
  osToEdit,
  onSuccess,
}: OrdemServicoModalProps) {
  const [form, setForm] = useState<FormState>(formVazio())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (osToEdit) {
      setForm({
        cliente: osToEdit.cliente || '',
        contrato: osToEdit.contrato || '',
        equipamento: osToEdit.equipamento || '',
        descricao: osToEdit.descricao || '',
        data_abertura: dataParaInput(osToEdit.data_abertura),
        prazo_acordado: dataParaInput(osToEdit.prazo_acordado),
        data_encerramento: dataParaInput(osToEdit.data_encerramento),
        status: osToEdit.status || 'aberta',
        responsavel_tecnico: osToEdit.responsavel_tecnico || '',
        observacoes: osToEdit.observacoes || '',
      })
    } else {
      setForm(formVazio())
    }
  }, [open, osToEdit])

  const setCampo = (campo: keyof FormState, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  // Ao trocar o cliente, limpa o contrato se ele pertencer a outro cliente
  const trocarCliente = (clienteId: string) =>
    setForm((f) => ({
      ...f,
      cliente: clienteId,
      contrato: contratos.some((c) => c.id === f.contrato && c.cliente === clienteId)
        ? f.contrato
        : '',
    }))

  const contratosDoCliente = form.cliente
    ? contratos.filter((c) => c.cliente === form.cliente)
    : contratos

  const handleSave = async () => {
    if (!form.cliente || !form.descricao.trim() || !form.data_abertura) {
      toast.error('Preencha cliente, descrição e data de abertura.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        cliente: form.cliente,
        contrato: form.contrato,
        equipamento: form.equipamento.trim(),
        descricao: form.descricao.trim(),
        data_abertura: form.data_abertura,
        prazo_acordado: form.prazo_acordado,
        data_encerramento: form.data_encerramento,
        status: form.status,
        responsavel_tecnico: form.responsavel_tecnico,
        observacoes: form.observacoes.trim(),
      }
      if (osToEdit) {
        await updateOrdemServico(osToEdit.id, payload)
        toast.success('Ordem de serviço atualizada!')
      } else {
        await createOrdemServico(payload)
        toast.success('Ordem de serviço criada!')
      }
      onSuccess()
      onOpenChange(false)
    } catch {
      toast.error('Erro ao salvar ordem de serviço.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">
            {osToEdit ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Registre o serviço executado para o cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select
              value={form.cliente || NENHUM}
              onValueChange={(v) => trocarCliente(v === NENHUM ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
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
            <Label>Contrato</Label>
            <Select
              value={form.contrato || NENHUM}
              onValueChange={(v) => setCampo('contrato', v === NENHUM ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Sem contrato</SelectItem>
                {contratosDoCliente.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.expand?.cliente?.name || 'Contrato'} • {c.tipo || '—'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Descrição do serviço *</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => setCampo('descricao', e.target.value)}
              placeholder="O que foi executado"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Equipamento</Label>
            <Input
              value={form.equipamento}
              onChange={(e) => setCampo('equipamento', e.target.value)}
              placeholder="Ex.: Carregador AC 22kW"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setCampo('status', v as OrdemServicoStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDEM_SERVICO_STATUS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data de abertura *</Label>
            <Input
              type="date"
              value={form.data_abertura}
              onChange={(e) => setCampo('data_abertura', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Prazo acordado</Label>
            <Input
              type="date"
              value={form.prazo_acordado}
              onChange={(e) => setCampo('prazo_acordado', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Data de encerramento</Label>
            <Input
              type="date"
              value={form.data_encerramento}
              onChange={(e) => setCampo('data_encerramento', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Responsável técnico</Label>
            <Select
              value={form.responsavel_tecnico || NENHUM}
              onValueChange={(v) => setCampo('responsavel_tecnico', v === NENHUM ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Não definido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Não definido</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setCampo('observacoes', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
