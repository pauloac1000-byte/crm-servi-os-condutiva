import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Botão padrão "Exportar PDF" — mesma pegada visual dos demais botões
 * outline do sistema. Página e relatório são definidos por quem o usa.
 */
export function BotaoExportarPdf({
  aoExportar,
  className = 'font-semibold text-xs h-10',
  rotulo = 'Exportar PDF',
}: {
  aoExportar: () => Promise<void> | void
  className?: string
  rotulo?: string
}) {
  const [gerando, setGerando] = useState(false)

  const executar = async () => {
    if (gerando) return
    setGerando(true)
    try {
      await aoExportar()
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button onClick={executar} variant="outline" className={className} disabled={gerando}>
      {gerando ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-1.5 h-4 w-4" />
      )}
      {rotulo}
    </Button>
  )
}
