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
import { getPlanos } from '@/services/planos'
import { Deal, EtapaFunil, DealStatus, Contact, Plano } from '@/types/crm'
import { toast } from 'sonner'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { isProximaEtapa, isCriterioCumprido, MSG_CRITERIO_PENDENTE } from '@/lib/criterio-saida'
import { AlertTriangle } from 'lucide-react'

interface DealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stages: EtapaFunil[]
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
  const [status, setStatus] = useState<DealStatus>('em andamento')
  const [contactId, setContactId] = useState('')
  const [priority, setPriority] = useState<'baixa' | 'média' | 'alta'>('média')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [planoId, setPlanoId] = useState('')
  const [valorMensal, setValorMensal] = useState('')
  const [valorImplantacao, setValorImplantacao] = useState('')
  const [prazoMeses, setPrazoMeses] = useState('')
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [justificativa, setJustificativa] = useState('')
  const { isAdmin } = useAuth()

  // Planos oficiais da empresa (coleção "planos" no Skip Cloud)
  useEffect(() => {
    if (!open) return
    getPlanos()
      .then(setPlanos)
      .catch(() => setPlanos([]))
  }, [open])

  // Sugere o valor mensal de referência do plano, sem sobrescrever o que o
  // usuário já digitou (o plano é referência; o valor real é editável).
  const handlePlanoChange = (novoPlanoId: string) => {
    setPlanoId(novoPlanoId)
    if (!novoPlanoId) return
    const plano = planos.find((p) => p.id === novoPlanoId)
    if (plano?.valor_mensal_referencia && !valorMensal) {
      setValorMensal(String(plano.valor_mensal_referencia))
    }
  }

  // Valor total do contrato: implantação + mensal × prazo (espelha o hook do servidor)
  const valorTotalCalc =
    (valorImplantacao ? Number(valorImplantacao) : 0) +
    (valorMensal ? Number(valorMensal) : 0) * (prazoMeses ? Number(prazoMeses) : 0)
  const temContrato =
    (valorImplantacao && Number(valorImplantacao) > 0) ||
    (valorMensal && Number(valorMensal) > 0 && prazoMeses && Number(prazoMeses) > 0)

  // Etapa de origem do negócio em edição e o estado do bloqueio do critério
  const etapaOrigem = dealToEdit ? stages.find((s) => s.id === dealToEdit.etapa) : undefined
  const etapaDestino = stages.find((s) => s.id === stageId)
  const avançoSemCritério =
    !!dealToEdit &&
    dealToEdit.status !== 'perdido' &&
    isProximaEtapa(etapaOrigem, etapaDestino) &&
    !isCriterioCumprido(etapaOrigem, dealToEdit)
  const avançoPermitido = !avançoSemCritério || (isAdmin && justificativa.trim() !== '')

  useEffect(() => {
    if (dealToEdit) {
      setTitle(dealToEdit.title || '')
      setValue(dealToEdit.value ? String(dealToEdit.value) : '0')
      setStageId(dealToEdit.etapa || stages[0]?.id || '')
      setStatus(dealToEdit.status || 'em andamento')
      setContactId(dealToEdit.contact || '')
      setPriority(dealToEdit.priority || 'média')
      setExpectedCloseDate(
        dealToEdit.expected_close_date ? dealToEdit.expected_close_date.split(' ')[0] : '',
      )
      setNotes(dealToEdit.notes || '')
      setPlanoId(dealToEdit.plano || '')
      setValorMensal(
        dealToEdit.valor_mensal !== undefined && dealToEdit.valor_mensal !== null
          ? String(dealToEdit.valor_mensal)
          : '',
      )
      setValorImplantacao(
        dealToEdit.valor_implantacao !== undefined && dealToEdit.valor_implantacao !== null
          ? String(dealToEdit.valor_implantacao)
          : '',
      )
      setPrazoMeses(
        dealToEdit.prazo_contrato_meses !== undefined && dealToEdit.prazo_contrato_meses !== null
          ? String(dealToEdit.prazo_contrato_meses)
          : '',
      )
    } else {
      setTitle('')
      setValue('')
      setStageId(defaultStageId || stages[0]?.id || '')
      setStatus('em andamento')
      setContactId(defaultContactId || contacts[0]?.id || '')
      setPriority('média')
      setExpectedCloseDate('')
      setNotes('')
      setPlanoId('')
      setValorMensal('')
      setValorImplantacao('')
      setPrazoMeses('')
    }
    setErrors({})
  }, [dealToEdit, open, stages, contacts, defaultContactId, defaultStageId])

  // Limpa a justificativa de forçar avanço ao abrir/fechar o modal
  useEffect(() => {
    setJustificativa('')
  }, [open, dealToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const payload: Partial<Deal> = {
        title: title.trim(),
        value: value ? Number(value) : 0,
        plano: planoId || undefined,
        valor_mensal: valorMensal ? Number(valorMensal) : undefined,
        valor_implantacao: valorImplantacao ? Number(valorImplantacao) : undefined,
        prazo_contrato_meses: prazoMeses ? Number(prazoMeses) : undefined,
        stage: stageId,
        etapa: stageId,
        status,
        contact: contactId,
        priority,
        notes: notes.trim(),
        expected_close_date: expectedCloseDate ? `${expectedCloseDate} 00:00:00.000Z` : undefined,
      }
      // "Perdido" não é mais etapa: guarda a etapa em que o negócio parou.
      if (status === 'perdido' && stageId) {
        payload.etapa_anterior = stageId
      }

      if (dealToEdit) {
        // Força o avanço quando o admin salva com justificativa sem critério cumprido
        if (avançoSemCritério && isAdmin) {
          payload.forcar_avanco = true
          payload.justificativa_avanco = justificativa.trim()
        }
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
        toast.error(getErrorMessage(err) || 'Ocorreu um erro ao salvar o negócio.')
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

          {/* Plano de serviço e valores do contrato — valor_total calculado no servidor */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="plano" className="text-slate-700 font-semibold text-xs">
                  Plano de Serviço
                </Label>
                <Select
                  value={planoId}
                  onValueChange={(val) => handlePlanoChange(val === 'none' ? '' : val)}
                >
                  <SelectTrigger id="plano">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano</SelectItem>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const planoSel = planos.find((p) => p.id === planoId)
                  if (!planoSel) return null
                  return (
                    <p className="text-[11px] text-slate-500">
                      {planoSel.valor_mensal_referencia
                        ? `Referência mensal: ${new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(planoSel.valor_mensal_referencia)}. `
                        : ''}
                      {planoSel.escopo || planoSel.descricao}
                    </p>
                  )
                })()}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valor_implantacao" className="text-slate-700 font-semibold text-xs">
                  Valor de Implantação (R$)
                </Label>
                <Input
                  id="valor_implantacao"
                  type="number"
                  placeholder="0.00"
                  value={valorImplantacao}
                  onChange={(e) => setValorImplantacao(e.target.value)}
                />
                {errors.valor_implantacao && (
                  <p className="text-xs text-rose-500">{errors.valor_implantacao}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="valor_mensal" className="text-slate-700 font-semibold text-xs">
                  Valor Mensal (R$)
                </Label>
                <Input
                  id="valor_mensal"
                  type="number"
                  placeholder="0.00"
                  value={valorMensal}
                  onChange={(e) => setValorMensal(e.target.value)}
                />
                {errors.valor_mensal && (
                  <p className="text-xs text-rose-500">{errors.valor_mensal}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="prazo_contrato_meses"
                  className="text-slate-700 font-semibold text-xs"
                >
                  Prazo do Contrato (meses)
                </Label>
                <Input
                  id="prazo_contrato_meses"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="12"
                  value={prazoMeses}
                  onChange={(e) => setPrazoMeses(e.target.value)}
                />
                {errors.prazo_contrato_meses && (
                  <p className="text-xs text-rose-500">{errors.prazo_contrato_meses}</p>
                )}
              </div>
            </div>

            {temContrato && (
              <p className="text-xs font-bold text-teal-700 text-right">
                Valor total do contrato:{' '}
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(valorTotalCalc)}
                <span className="block font-normal text-[10px] text-slate-500">
                  implantação + valor mensal × prazo
                </span>
              </p>
            )}
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
                      {st.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.etapa && <p className="text-xs text-rose-500">{errors.etapa}</p>}
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
                  {contacts.map((c) => {
                    const loc = [c.cidade, c.estado].filter(Boolean).join(' - ')
                    const info = [c.company, loc].filter(Boolean).join(', ')
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {info ? `(${info})` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-slate-700 font-semibold text-xs">
                Status
              </Label>
              {/* "Perdido" não é etapa: ao salvar, a etapa escolhida é guardada em etapa_anterior */}
              <Select value={status} onValueChange={(val: DealStatus) => setStatus(val)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em andamento">Em andamento</SelectItem>
                  <SelectItem value="ganho">Ganho</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
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
          </div>

          {/* Bloqueio do critério de saída no avanço pela edição */}
          {avançoSemCritério && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                {MSG_CRITERIO_PENDENTE}
              </p>
              {isAdmin ? (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="justificativa_avanco"
                    className="text-amber-800 font-semibold text-xs"
                  >
                    Justificativa do administrador (obrigatória para forçar o avanço)
                  </Label>
                  <Textarea
                    id="justificativa_avanco"
                    rows={3}
                    placeholder="Descreva a justificativa para forçar o avanço…"
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                  />
                </div>
              ) : (
                <p className="text-xs text-amber-700">
                  Confirme os itens do critério na tela do negócio ou peça ao administrador para
                  forçar o avanço.
                </p>
              )}
            </div>
          )}

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
              disabled={loading || !avançoPermitido}
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
