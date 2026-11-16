import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle } from 'lucide-react'

interface ForcarAvancoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  etapaAtualNome?: string
  etapaDestinoNome?: string
  onConfirm: (justificativa: string) => Promise<void>
}

// Diálogo exclusivo do admin para forçar o avanço de etapa sem o critério
// cumprido — a justificativa é obrigatória e fica gravada no histórico.
export function ForcarAvancoDialog({
  open,
  onOpenChange,
  etapaAtualNome,
  etapaDestinoNome,
  onConfirm,
}: ForcarAvancoDialogProps) {
  const [justificativa, setJustificativa] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const handleConfirm = async () => {
    if (!justificativa.trim()) return
    setConfirmando(true)
    try {
      await onConfirm(justificativa.trim())
      setJustificativa('')
      onOpenChange(false)
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Forçar avanço de etapa
          </DialogTitle>
          <DialogDescription className="text-xs text-left leading-relaxed">
            Esta oportunidade ainda não cumpriu o critério de saída da etapa atual
            {etapaAtualNome ? ` (${etapaAtualNome})` : ''}. Como administrador, você pode forçar o
            avanço para{' '}
            {etapaDestinoNome ? <strong>{etapaDestinoNome}</strong> : 'a etapa seguinte'}. A
            justificativa ficará gravada no histórico do negócio.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Descreva a justificativa para forçar o avanço…"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          rows={4}
          className="text-sm"
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={confirmando}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={!justificativa.trim() || confirmando}
            onClick={handleConfirm}
          >
            {confirmando ? 'Forçando…' : 'Forçar avanço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
