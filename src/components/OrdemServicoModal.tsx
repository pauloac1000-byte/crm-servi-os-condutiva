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
import { chaveLocalidade, rotuloLocalidade, CHAVE_TODAS } from '@/hooks/use-visita-empresa'
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

  // Fluxo Empresa → Localidade (cidade/estado) → Contato, espelhando o modal
  // de visitas comerciais: o campo "cliente" da OS guarda o id do contato, mas
  // o select mostra a EMPRESA (campo "company" dos contatos). A empresa é
  // gravada no próprio registro (campo "empresa") para robustez na edição.
  const [empresa, setEmpresa] = useState('')
  const [localidade, setLocalidade] = useState('')

  useEffect(() => {
    if (!open) return
    if (osToEdit) {
      const contatosDisponiveis = contacts.length
        ? contacts
        : osToEdit.expand?.cliente
          ? [osToEdit.expand.cliente]
          : []
      const contatoAtual = contatosDisponiveis.find((c) => c.id === osToEdit.cliente)
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
      // Repõe empresa/localidade do que está gravado na OS (ou, em registros
      // antigos sem empresa gravada, do contato vinculado) sem perder dados.
      const empresaGravada = (osToEdit.empresa || contatoAtual?.company || '').trim()
      setEmpresa(empresaGravada)
      const localidadesGravadas = new Set(
        contatosDisponiveis
          .filter((c) => (c.company || '').trim() === empresaGravada)
          .map((c) => chaveLocalidade(c.cidade, c.estado))
          .filter((k) => k !== '|'),
      )
      const multiplas = localidadesGravadas.size > 1
      setLocalidade(
        multiplas && contatoAtual ? chaveLocalidade(contatoAtual.cidade, contatoAtual.estado) : '',
      )
    } else {
      setForm(formVazio())
      setEmpresa('')
      setLocalidade('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, osToEdit])

  const setCampo = (campo: keyof FormState, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  // Empresas distintas (campo "company" dos contatos); mantém a empresa já
  // gravada na OS mesmo que nenhum contato a tenha mais (edição robusta).
  const empresasDisponiveis = (() => {
    const unicas = new Set(contacts.map((c) => (c.company || '').trim()).filter(Boolean))
    if (empresa) unicas.add(empresa)
    return Array.from(unicas).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  })()

  const contatosDaEmpresa = empresa
    ? contacts.filter((c) => (c.company || '').trim() === empresa)
    : []

  // Localidades (cidade + estado) distintas entre os contatos da empresa
  const localidadesDaEmpresa = (() => {
    const mapa = new Map<string, { cidade: string; estado: string }>()
    contatosDaEmpresa.forEach((c) => {
      const cidade = (c.cidade || '').trim()
      const estado = (c.estado || '').trim()
      if (!cidade && !estado) return
      const chave = `${cidade}|${estado}`
      if (!mapa.has(chave)) mapa.set(chave, { cidade, estado })
    })
    return Array.from(mapa.values()).sort((a, b) =>
      rotuloLocalidade(a.cidade, a.estado).localeCompare(
        rotuloLocalidade(b.cidade, b.estado),
        'pt-BR',
      ),
    )
  })()

  // Com uma única localidade, ela já vale por si (select nem aparece)
  const localidadeEfetiva =
    localidadesDaEmpresa.length === 1
      ? `${localidadesDaEmpresa[0].cidade}|${localidadesDaEmpresa[0].estado}`
      : localidade

  const contatosFiltrados = (() => {
    if (!localidadeEfetiva) return contatosDaEmpresa
    const [cidade, estado] = localidadeEfetiva.split('|')
    return contatosDaEmpresa.filter(
      (c) => (c.cidade || '').trim() === cidade && (c.estado || '').trim() === estado,
    )
  })()

  // Sem empresa escolhida: não lista contatos — exceto o contato já gravado na
  // OS (edição de registros antigos sem empresa), para não perdê-lo.
  const contatosParaLista = empresa
    ? contatosFiltrados
    : form.cliente
      ? contacts.filter((c) => c.id === form.cliente)
      : []

  // Ao escolher uma empresa: limpa contato e contrato de outra empresa.
  const selecionarEmpresa = (novaEmpresa: string) => {
    setEmpresa(novaEmpresa)
    setLocalidade('')
    setForm((f) => {
      const contato = contacts.find((c) => c.id === f.cliente)
      const contatoMesmaEmpresa = !!contato && (contato.company || '').trim() === novaEmpresa
      return {
        ...f,
        cliente: contatoMesmaEmpresa ? f.cliente : '',
        contrato: '',
      }
    })
  }

  // Ao escolher uma localidade: limpa o contato de outra localidade.
  const selecionarLocalidade = (chave: string) => {
    const efetiva = chave === CHAVE_TODAS ? '' : chave
    setLocalidade(efetiva)
    if (!efetiva) return
    const [cidade, estado] = efetiva.split('|')
    setForm((f) => {
      const c = contacts.find((x) => x.id === f.cliente)
      if (!c) return f
      const mesma = (c.cidade || '').trim() === cidade && (c.estado || '').trim() === estado
      return mesma ? f : { ...f, cliente: '' }
    })
  }

  // Ao trocar o contato, limpa o contrato se ele pertencer a outro cliente
  const trocarContato = (clienteId: string) =>
    setForm((f) => ({
      ...f,
      cliente: clienteId,
      contrato: contratos.some((c) => c.id === f.contrato && c.cliente === clienteId)
        ? f.contrato
        : '',
    }))

  const contratosDaEmpresa = empresa
    ? contratos.filter((c) => {
        if (c.cliente === form.cliente) return true
        const contatoContrato = contacts.find((x) => x.id === c.cliente)
        return (contatoContrato?.company || '').trim() === empresa
      })
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
        // empresa = nome da empresa selecionada (texto), gravada no registro
        empresa: empresa.trim() || undefined,
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
            <Select value={empresa} onValueChange={selecionarEmpresa}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresasDisponiveis.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Cidade / Estado</Label>
            {localidadesDaEmpresa.length > 1 ? (
              <Select value={localidade} onValueChange={selecionarLocalidade}>
                <SelectTrigger>
                  <SelectValue placeholder={empresa ? 'Todas' : '—'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CHAVE_TODAS}>Todas as localidades</SelectItem>
                  {localidadesDaEmpresa.map((l) => (
                    <SelectItem key={`${l.cidade}|${l.estado}`} value={`${l.cidade}|${l.estado}`}>
                      {rotuloLocalidade(l.cidade, l.estado)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                readOnly
                value={
                  localidadesDaEmpresa.length === 1
                    ? rotuloLocalidade(
                        localidadesDaEmpresa[0].cidade,
                        localidadesDaEmpresa[0].estado,
                      )
                    : ''
                }
                placeholder="—"
                className="bg-slate-50 text-slate-500"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Contato *</Label>
            <Select
              value={form.cliente || NENHUM}
              onValueChange={(v) => trocarContato(v === NENHUM ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={empresa ? 'Nenhum' : 'Selecione a empresa'} />
              </SelectTrigger>
              <SelectContent>
                {contatosParaLista.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!empresa && (
              <p className="text-[11px] text-slate-400 italic">Selecione a empresa primeiro</p>
            )}
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
                {contratosDaEmpresa.map((c) => (
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
