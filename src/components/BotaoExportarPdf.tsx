import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'

interface Props {
  aoGerar: () => Promise<void>
  className?: string
}

// Botão padrão "Exportar PDF" das páginas do CRM (Leads, Contatos, Atividades,
// Pipeline, Visitas, Contratos). Mantém o estado da tela: só aguarda a geração.
export function BotaoExportarPdf({ aoGerar, className }: Props) {
  const [gerando, setGerando] = useState(false)

  return (
    <Button
      variant="outline"
      className={`font-semibold text-xs h-10 ${className ?? ''}`}
      disabled={gerando}
      onClick={async () => {
        setGerando(true)
        try {
          await aoGerar()
        } finally {
          setGerando(false)
        }
      }}
    >
      {gerando ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-1.5 h-4 w-4" />
      )}
      {gerando ? 'Gerando…' : 'Exportar PDF'}
    </Button>
  )
}
