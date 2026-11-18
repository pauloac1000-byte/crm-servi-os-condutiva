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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createContrato, updateContrato } from '@/services/contratos'
import { getPlanos } from '@/services/planos'
import { Contrato, Contact, Deal, User, Plano } from '@/types/crm'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'

interface ContratoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  deals: Deal[]
  users?: User[]
  contratoToEdit?: Contrato | null
  // Pré-preenchimento a partir de um negócio (avanço para a etapa 6 Compromisso)
  defaultDealId?: string
  defaultResponsavelId?: string
  dealPrefill?: Deal | null
  onSuccess: () => void
}

const VALORES_INICIAIS = {
  data_inicio: '',
  data_fim: '',
  clienteId: '',
  negocioId: '',
  planoId: '',
  responsavelId: '',
  informacoes_plano: '',
  valor_mensal: '',
  status: 'ativo' as 'ativo' | 'encerrado' | 'suspenso',
  tipo: 'novo' as 'novo' | 'renovação' | 'expansão' | 'contração' | 'churn',
}

const dataStr = (d?: string) => (d ? d.split(' ')[0].split('T')[0] : '')

export function ContratoModal({
  open,
  onOpenChange,
  contacts,
  deals,
  users = [],
  contratoToEdit,
  defaultDealId,
  defaultResponsavelId,
  dealPrefill,
  onSuccess,
}: ContratoModalProps) {
  const [valores, setValores] = useState(VALORES_INICIAIS)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    getPlanos()
      .then(setPlanos)
      .catch(() => setPlanos([]))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (contratoToEdit) {
      setValores({
        data_inicio: dataStr(contratoToEdit.data_inicio),
        data_fim: dataStr(contratoToEdit.data_fim),
        clienteId: contratoToEdit.cliente || '',
        negocioId: contratoToEdit.negocio || '',
        planoId: contratoToEdit.plano || '',
        responsavelId: contratoToEdit.responsavel || '',
        informacoes_plano: contratoToEdit.informacoes_plano || '',
        valor_mensal:
          contratoToEdit.valor_mensal !== undefined && contratoToEdit.valor_mensal !== null
            ? String(contratoToEdit.valor_mensal)
            : '',
        status: contratoToEdit.status || 'ativo',
        tipo: contratoToEdit.tipo || 'novo',
      })
    } else {
      // Novo contrato: pré-preenche com o negócio indicado (avanço para a
      // etapa 6 Compromisso) e os valores dele — editáveis pelo usuário.
      const deal =
        dealPrefill || (defaultDealId ? deals.find((d) => d.id === defaultDealId) : undefined)
      const contatoDoDeal = deal
        ? contacts.find((c) => c.id === (deal.contact || deal.expand?.contact?.id))
        : undefined
      setValores({
        ...VALORES_INICIAIS,
        negocioId: deal?.id || '',
        clienteId: deal?.contact || contatoDoDeal?.id || '',
        planoId: deal?.plano || '',
        responsavelId: defaultResponsavelId || '',
        valor_mensal:
          deal?.valor_mensal !== undefined && deal?.valor_mensal !== null
            ? String(deal.valor_mensal)
            : '',
        status: 'ativo',
        tipo: 'novo',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoToEdit, open, defaultDealId, defaultResponsavelId, deals, contacts, dealPrefill])

  const set = (campo: keyof typeof VALORES_INICIAIS, valor: string) =>
    setValores((v) => ({ ...v, [campo]: valor }))

  // Contato vinculado ao negócio selecionado (para exibir empresa + contato)
  const dealSelecionado = valores.negocioId
    ? deals.find((d) => d.id === valores.negocioId)
    : undefined
  const contatoDoNegocio = dealSelecionado
    ? contacts.find(
        (c) => c.id === (dealSelecionado.contact || dealSelecionado.expand?.contact?.id),
      )
    : undefined

  // Cliente exibido quando há negócio de origem: nome da empresa (o nome do
  // negócio) com o nome do contato junto — somente leitura.
  const rotuloClienteDoNegocio = (() => {
    if (!dealSelecionado || !contatoDoNegocio) return ''
    const empresa =
      contatoDoNegocio.company || dealSelecionado.expand?.contact?.company || dealSelecionado.title
    return `${empresa} — ${contatoDoNegocio.name}`
  })()

  // Escolha do negócio preenche cliente (contato do negócio), plano e valores
  // automaticamente — editáveis depois pelo usuário.
  const handleNegocioChange = (novoNegocioId: string) => {
    set('negocioId', novoNegocioId)
    if (!novoNegocioId) {
      // Removeu o negócio: libera o cliente para seleção manual, mantendo
      // plano/valores já digitados.
      setValores((v) => {
        const dealAnterior = deals.find((d) => d.id === v.negocioId)
        const contatoAnterior = dealAnterior
          ? contacts.find(
              (c) => c.id === (dealAnterior.contact || dealAnterior.expand?.contact?.id),
            )
          : undefined
        const clienteVeioDoNegocio =
          !contatoAnterior || v.clienteId === (dealAnterior?.contact || contatoAnterior.id)
        return clienteVeioDoNegocio
          ? { ...v, negocioId: '', clienteId: '' }
          : { ...v, negocioId: '' }
      })
      return
    }
    const deal = deals.find((d) => d.id === novoNegocioId)
    if (!deal) return
    const contato = contacts.find((c) => c.id === (deal.contact || deal.expand?.contact?.id))
    setValores((v) => ({
      ...v,
      negocioId: deal.id,
      clienteId: deal.contact || contato?.id || v.clienteId,
      planoId: deal.plano || v.planoId,
      valor_mensal:
        deal.valor_mensal !== undefined && deal.valor_mensal !== null
          ? String(deal.valor_mensal)
          : v.valor_mensal,
    }))
  }

  // Sugere o valor mensal de referência do plano, sem sobrescrever o que o
  // usuário já digitou (o plano é referência; o valor real é editável).
  const handlePlanoChange = (novoPlanoId: string) => {
    set('planoId', novoPlanoId)
    if (!novoPlanoId) return
    const plano = planos.find((p) => p.id === novoPlanoId)
    if (plano?.valor_mensal_referencia && !valores.valor_mensal) {
      set('valor_mensal', String(plano.valor_mensal_referencia))
    }
  }

  const toNum = (v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? 0 : n
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: Partial<Contrato> = {
        cliente: valores.clienteId || undefined,
        negocio: valores.negocioId || undefined,
        plano: valores.planoId || undefined,
        responsavel: valores.responsavelId || undefined,
        informacoes_plano: valores.informacoes_plano || undefined,
        valor_mensal: toNum(valores.valor_mensal),
        data_inicio: valores.data_inicio ? `${valores.data_inicio} 00:00:00.000Z` : undefined,
        data_fim: valores.data_fim ? `${valores.data_fim} 00:00:00.000Z` : undefined,
        status: valores.status,
        tipo: valores.tipo,
      }

      if (contratoToEdit) {
        await updateContrato(contratoToEdit.id, payload)
        toast.success('Contrato atualizado com sucesso!')
      } else {
        await createContrato(payload)
        toast.success('Contrato registrado com sucesso!')
      }

      onSuccess()
      onOpenChange(false)
    } catch (_) {
      toast.error('Erro ao salvar contrato.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const valorTotalCalc = toNum(valores.valor_mensal) * 12
  // fallback de resumo quando o prazo ainda não foi informado (12 meses padrão)
  const prazoMeses =
    valores.data_inicio && valores.data_fim
      ? Math.max(
          0,
          Math.round(
            (new Date(valores.data_fim).getTime() - new Date(valores.data_inicio).getTime()) /
              (1000 * 60 * 60 * 24 * 30.44),
          ),
        )
      : 0
  const valorTotalContrato = toNum(valores.valor_mensal) * prazoMeses

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-700" />
            {contratoToEdit ? 'Editar Contrato' : 'Novo Contrato'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c_negocio" className="text-slate-700 font-semibold text-xs">
                Lead de origem
              </Label>
              <Select
                value={valores.negocioId}
                onValueChange={(val) => handleNegocioChange(val === 'none' ? '' : val)}
              >
                <SelectTrigger id="c_negocio">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              {dealSelecionado && contatoDoNegocio ? (
                // Com negócio de origem: cliente vem do negócio (empresa +
                // contato), somente leitura.
                <>
                  <Label htmlFor="c_cliente" className="text-slate-700 font-semibold text-xs">
                    Cliente *
                  </Label>
                  <div
                    id="c_cliente"
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-700 truncate"
                    title={rotuloClienteDoNegocio}
                  >
                    {rotuloClienteDoNegocio}
                  </div>
                </>
              ) : (
                <>
                  <Label htmlFor="c_cliente" className="text-slate-700 font-semibold text-xs">
                    Cliente *
                  </Label>
                  <Select value={valores.clienteId} onValueChange={(val) => set('clienteId', val)}>
                    <SelectTrigger id="c_cliente">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c_plano" className="text-slate-700 font-semibold text-xs">
                Plano
              </Label>
              <Select
                value={valores.planoId}
                onValueChange={(val) => handlePlanoChange(val === 'none' ? '' : val)}
              >
                <SelectTrigger id="c_plano">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {planos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c_tipo" className="text-slate-700 font-semibold text-xs">
                Tipo
              </Label>
              <Select value={valores.tipo} onValueChange={(val) => set('tipo', val)}>
                <SelectTrigger id="c_tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="renovação">Renovação</SelectItem>
                  <SelectItem value="expansão">Expansão</SelectItem>
                  <SelectItem value="contração">Contração</SelectItem>
                  <SelectItem value="churn">Churn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c_informacoes_plano" className="text-slate-700 font-semibold text-xs">
              Informações do plano contratado (opcional)
            </Label>
            <Textarea
              id="c_informacoes_plano"
              placeholder="Observações sobre o que foi contratado: escopo, condições, particularidades..."
              rows={3}
              value={valores.informacoes_plano}
              onChange={(e) => set('informacoes_plano', e.target.value)}
            />
          </div>

          <div>
            <div className="space-y-1.5">
              <Label htmlFor="c_valor_mensal" className="text-slate-700 font-semibold text-xs">
                Valor Mensal (R$)
              </Label>
              <Input
                id="c_valor_mensal"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={valores.valor_mensal}
                onChange={(e) => set('valor_mensal', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c_data_inicio" className="text-slate-700 font-semibold text-xs">
                Data de Início
              </Label>
              <Input
                id="c_data_inicio"
                type="date"
                value={valores.data_inicio}
                onChange={(e) => set('data_inicio', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_data_fim" className="text-slate-700 font-semibold text-xs">
                Data de Fim
              </Label>
              <Input
                id="c_data_fim"
                type="date"
                value={valores.data_fim}
                onChange={(e) => set('data_fim', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c_status" className="text-slate-700 font-semibold text-xs">
                Status
              </Label>
              <Select value={valores.status} onValueChange={(val) => set('status', val)}>
                <SelectTrigger id="c_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_responsavel" className="text-slate-700 font-semibold text-xs">
                Responsável
              </Label>
              <Select
                value={valores.responsavelId}
                onValueChange={(val) => set('responsavelId', val)}
              >
                <SelectTrigger id="c_responsavel">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumo do valor do contrato a partir dos campos preenchidos */}
          {!!toNum(valores.valor_mensal) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Mensalidade ({prazoMeses || 12} {prazoMeses === 1 ? 'mês' : 'meses'})
                </span>
                <span>{formatCurrency(toNum(valores.valor_mensal) * (prazoMeses || 12))}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                  Valor total do contrato
                  <span className="block font-normal normal-case tracking-normal text-[10px] text-slate-500">
                    valor mensal × prazo
                  </span>
                </span>
                <span className="text-sm font-black text-teal-700">
                  {formatCurrency(prazoMeses ? valorTotalContrato : valorTotalCalc)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
            >
              {loading ? 'Salvando...' : contratoToEdit ? 'Atualizar' : 'Registrar Contrato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
