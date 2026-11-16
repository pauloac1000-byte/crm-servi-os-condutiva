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
import { createVisita, updateVisita } from '@/services/visitas'
import { VisitaComercial, Contact, Deal, User } from '@/types/crm'
import { toast } from 'sonner'

interface VisitasModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  deals: Deal[]
  users: User[]
  visitaToEdit?: VisitaComercial | null
  defaultContactId?: string
  defaultDealId?: string
  defaultResponsavelId?: string
  onSuccess: () => void
}

const VALORES_INICIAIS = {
  data: '',
  tipo: 'presencial' as 'presencial' | 'remota',
  contatoId: '',
  negocioId: '',
  responsavelId: '',
  km_rodados: '',
  valor_combustivel: '',
  pedagio: '',
  alimentacao: '',
  hospedagem: '',
  horas_dedicadas: '',
  outros_custos: '',
  resultado: '',
}

const toNum = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const numToStr = (v?: number) => (typeof v === 'number' && v !== 0 ? String(v) : '')

export function VisitasModal({
  open,
  onOpenChange,
  contacts,
  deals,
  users,
  visitaToEdit,
  defaultContactId,
  defaultDealId,
  defaultResponsavelId,
  onSuccess,
}: VisitasModalProps) {
  const [valores, setValores] = useState(VALORES_INICIAIS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visitaToEdit) {
      setValores({
        data: visitaToEdit.data ? visitaToEdit.data.split(' ')[0].split('T')[0] : '',
        tipo: visitaToEdit.tipo || 'presencial',
        contatoId: visitaToEdit.contato || '',
        negocioId: visitaToEdit.negocio || '',
        responsavelId: visitaToEdit.responsavel || '',
        km_rodados: numToStr(visitaToEdit.km_rodados),
        valor_combustivel: numToStr(visitaToEdit.valor_combustivel),
        pedagio: numToStr(visitaToEdit.pedagio),
        alimentacao: numToStr(visitaToEdit.alimentacao),
        hospedagem: numToStr(visitaToEdit.hospedagem),
        horas_dedicadas: numToStr(visitaToEdit.horas_dedicadas),
        outros_custos: numToStr(visitaToEdit.outros_custos),
        resultado: visitaToEdit.resultado || '',
      })
    } else {
      setValores({
        ...VALORES_INICIAIS,
        responsavelId: defaultResponsavelId || '',
        contatoId: defaultContactId || '',
        negocioId: defaultDealId || '',
      })
    }
  }, [visitaToEdit, open, defaultContactId, defaultDealId, defaultResponsavelId])

  const set = (campo: keyof typeof VALORES_INICIAIS, valor: string) =>
    setValores((v) => ({ ...v, [campo]: valor }))

  const custoCalculado =
    toNum(valores.valor_combustivel) +
    toNum(valores.pedagio) +
    toNum(valores.alimentacao) +
    toNum(valores.hospedagem) +
    toNum(valores.outros_custos)

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: Partial<VisitaComercial> = {
        data: valores.data ? `${valores.data} 00:00:00.000Z` : undefined,
        tipo: valores.tipo,
        contato: valores.contatoId || undefined,
        negocio: valores.negocioId || undefined,
        responsavel: valores.responsavelId || undefined,
        km_rodados: toNum(valores.km_rodados),
        valor_combustivel: toNum(valores.valor_combustivel),
        pedagio: toNum(valores.pedagio),
        alimentacao: toNum(valores.alimentacao),
        hospedagem: toNum(valores.hospedagem),
        horas_dedicadas: toNum(valores.horas_dedicadas),
        outros_custos: toNum(valores.outros_custos),
        resultado: valores.resultado.trim(),
      }

      if (visitaToEdit) {
        await updateVisita(visitaToEdit.id, payload)
        toast.success('Visita atualizada com sucesso!')
      } else {
        await createVisita(payload)
        toast.success('Visita registrada com sucesso!')
      }

      onSuccess()
      onOpenChange(false)
    } catch (_) {
      toast.error('Erro ao salvar visita.')
    } finally {
      setLoading(false)
    }
  }

  const campoMoeda = (
    campo: 'valor_combustivel' | 'pedagio' | 'alimentacao' | 'hospedagem' | 'outros_custos',
    rotulo: string,
    id: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-slate-700 font-semibold text-xs">
        {rotulo} (R$)
      </Label>
      <Input
        id={id}
        type="number"
        min="0"
        step="0.01"
        placeholder="0,00"
        value={valores[campo]}
        onChange={(e) => set(campo, e.target.value)}
      />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {visitaToEdit ? 'Editar Visita' : 'Nova Visita Comercial'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v_data" className="text-slate-700 font-semibold text-xs">
                Data da Visita *
              </Label>
              <Input
                id="v_data"
                type="date"
                value={valores.data}
                onChange={(e) => set('data', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v_tipo" className="text-slate-700 font-semibold text-xs">
                Tipo
              </Label>
              <Select value={valores.tipo} onValueChange={(val) => set('tipo', val)}>
                <SelectTrigger id="v_tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="remota">Remota</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v_contato" className="text-slate-700 font-semibold text-xs">
                Contato
              </Label>
              <Select value={valores.contatoId} onValueChange={(val) => set('contatoId', val)}>
                <SelectTrigger id="v_contato">
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
              <Label htmlFor="v_negocio" className="text-slate-700 font-semibold text-xs">
                Negócio
              </Label>
              <Select value={valores.negocioId} onValueChange={(val) => set('negocioId', val)}>
                <SelectTrigger id="v_negocio">
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
            <Label htmlFor="v_responsavel" className="text-slate-700 font-semibold text-xs">
              Responsável
            </Label>
            <Select
              value={valores.responsavelId}
              onValueChange={(val) => set('responsavelId', val)}
            >
              <SelectTrigger id="v_responsavel">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v_km" className="text-slate-700 font-semibold text-xs">
                KM Rodados
              </Label>
              <Input
                id="v_km"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={valores.km_rodados}
                onChange={(e) => set('km_rodados', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v_horas" className="text-slate-700 font-semibold text-xs">
                Horas Dedicadas
              </Label>
              <Input
                id="v_horas"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={valores.horas_dedicadas}
                onChange={(e) => set('horas_dedicadas', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {campoMoeda('valor_combustivel', 'Valor do Combustível', 'v_combustivel')}
            {campoMoeda('pedagio', 'Pedágio', 'v_pedagio')}
            {campoMoeda('alimentacao', 'Alimentação', 'v_alimentacao')}
            {campoMoeda('hospedagem', 'Hospedagem', 'v_hospedagem')}
          </div>

          {campoMoeda('outros_custos', 'Outros Custos', 'v_outros')}

          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              Custo Total
            </span>
            <span className="text-sm font-black text-teal-700">
              {formatCurrency(custoCalculado)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v_resultado" className="text-slate-700 font-semibold text-xs">
              Resultado
            </Label>
            <Textarea
              id="v_resultado"
              rows={3}
              placeholder="Descreva o resultado da visita..."
              value={valores.resultado}
              onChange={(e) => set('resultado', e.target.value)}
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
              {loading ? 'Salvando...' : visitaToEdit ? 'Atualizar' : 'Registrar Visita'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
