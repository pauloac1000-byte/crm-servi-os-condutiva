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
import { getConfiguracoes, updateConfiguracoes, Configuracoes } from '@/services/configuracoes'
import { toast } from 'sonner'

interface ConfiguracoesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const numToStr = (v?: number) => (typeof v === 'number' ? String(v) : '')

export function ConfiguracoesModal({ open, onOpenChange, onSuccess }: ConfiguracoesModalProps) {
  const [custoKm, setCustoKm] = useState('')
  const [custoHora, setCustoHora] = useState('')
  const [configId, setConfigId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let ativo = true
    getConfiguracoes()
      .then((c: Configuracoes | null) => {
        if (!ativo || !c) return
        setConfigId(c.id)
        setCustoKm(numToStr(c.custo_km))
        setCustoHora(numToStr(c.custo_hora_comercial))
      })
      .catch(() => {
        if (ativo) toast.error('Erro ao carregar configurações.')
      })
    return () => {
      ativo = false
    }
  }, [open])

  const toNum = (v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? 0 : n
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configId) {
      toast.error('Configurações não encontradas.')
      return
    }
    setLoading(true)
    try {
      await updateConfiguracoes(configId, {
        custo_km: toNum(custoKm),
        custo_hora_comercial: toNum(custoHora),
      })
      toast.success('Configurações salvas com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (_) {
      toast.error('Erro ao salvar configurações — verifique se você é administrador.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Parâmetros de Custo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cfg_km" className="text-slate-700 font-semibold text-xs">
              Custo por KM Rodado (R$)
            </Label>
            <Input
              id="cfg_km"
              type="number"
              min="0"
              step="0.01"
              placeholder="2,50"
              value={custoKm}
              onChange={(e) => setCustoKm(e.target.value)}
            />
            <p className="text-[11px] text-slate-400">
              Usado para pré-preencher o valor do combustível nas visitas (km × custo por km).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cfg_hora" className="text-slate-700 font-semibold text-xs">
              Custo da Hora Comercial (R$)
            </Label>
            <Input
              id="cfg_hora"
              type="number"
              min="0"
              step="0.01"
              placeholder="90,00"
              value={custoHora}
              onChange={(e) => setCustoHora(e.target.value)}
            />
            <p className="text-[11px] text-slate-400">
              Somado ao custo total da visita: horas dedicadas × custo da hora.
            </p>
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
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
