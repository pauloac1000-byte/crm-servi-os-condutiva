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
import { createMovimentoReceita } from '@/services/movimentos_receita'
import { getContratos } from '@/services/contratos'
import { Contrato, ContratoTipo, MovimentoReceita } from '@/types/crm'
import { toast } from 'sonner'
import { TrendingUp } from 'lucide-react'

interface MovimentoReceitaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Competência pré-selecionada (AAAA-MM), quando aberto a partir da tabela
  defaultCompetencia?: string
  onSuccess: () => void
}

const TIPOS = ['novo', 'renovação', 'expansão', 'contração', 'churn'] as const

const competenciaAtual = () => {
  const agora = new Date()
  const m = agora.getMonth() + 1
  return `${agora.getFullYear()}-${m < 10 ? '0' + m : m}`
}

export function MovimentoReceitaModal({
  open,
  onOpenChange,
  defaultCompetencia,
  onSuccess,
}: MovimentoReceitaModalProps) {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [tipo, setTipo] = useState<ContratoTipo>('novo')
  const [valor, setValor] = useState('')
  const [contratoId, setContratoId] = useState('')
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setCompetencia(defaultCompetencia || competenciaAtual())
    setTipo('novo')
    setValor('')
    setContratoId('')
    getContratos()
      .then(setContratos)
      .catch(() => setContratos([]))
  }, [open, defaultCompetencia])

  const toNum = (v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? 0 : n
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}-\d{2}$/.test(competencia)) {
      toast.error('Informe a competência no formato AAAA-MM.')
      return
    }
    setLoading(true)
    try {
      const payload: Partial<MovimentoReceita> = {
        competencia,
        tipo,
        valor_mensal: toNum(valor),
        contrato: contratoId || undefined,
      }
      await createMovimentoReceita(payload)
      toast.success('Movimento de receita lançado com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (_) {
      toast.error('Erro ao lançar movimento de receita.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-700" />
            Lançar Movimento de Receita
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="m_competencia" className="text-slate-700 font-semibold text-xs">
              Competência (AAAA-MM) *
            </Label>
            <Input
              id="m_competencia"
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m_tipo" className="text-slate-700 font-semibold text-xs">
                Tipo *
              </Label>
              <Select value={tipo} onValueChange={(val) => setTipo(val as ContratoTipo)}>
                <SelectTrigger id="m_tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m_valor" className="text-slate-700 font-semibold text-xs">
                Valor Mensal (R$) *
              </Label>
              <Input
                id="m_valor"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m_contrato" className="text-slate-700 font-semibold text-xs">
              Contrato (opcional)
            </Label>
            <Select
              value={contratoId || 'none'}
              onValueChange={(val) => setContratoId(val === 'none' ? '' : val)}
            >
              <SelectTrigger id="m_contrato">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.expand?.cliente?.name
                      ? `${c.expand.cliente.name}${c.valor_mensal ? ` — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor_mensal)}` : ''}`
                      : 'Contrato sem cliente'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {loading ? 'Salvando...' : 'Lançar Movimento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
