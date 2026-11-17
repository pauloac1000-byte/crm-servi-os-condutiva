import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Contrato, OrdemServico } from '@/types/crm'
import { getOrdensServico } from '@/services/ordens_servico'
import { OrdensServicoBloco } from '@/components/OrdensServicoBloco'

interface ContratoOsDrawerProps {
  contrato: Contrato | null
  open: boolean
  onClose: () => void
}

// Drawer de detalhe do contrato: mostra as OS vinculadas a ele (somente leitura)
export function ContratoOsDrawer({ contrato, open, onClose }: ContratoOsDrawerProps) {
  const [ordens, setOrdens] = useState<OrdemServico[]>([])

  useEffect(() => {
    if (!open || !contrato) return
    getOrdensServico(`contrato='${contrato.id}'`)
      .then(setOrdens)
      .catch(() => setOrdens([]))
  }, [open, contrato])

  if (!contrato) return null

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 bg-slate-50">
        <SheetHeader className="pb-4 border-b border-slate-200">
          <SheetTitle className="text-xl font-bold text-slate-900 leading-tight">
            {contrato.expand?.cliente?.name || 'Contrato'}
          </SheetTitle>
          <p className="text-xs text-slate-500">Ordens de serviço do contrato</p>
        </SheetHeader>
        <div className="pt-6">
          <OrdensServicoBloco ordens={ordens} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
