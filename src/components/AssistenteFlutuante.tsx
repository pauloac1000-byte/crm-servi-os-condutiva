import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Botão flutuante "Assistente" + painel lateral carregado SOB DEMANDA
// (React.lazy + import dinâmico): o código do painel não entra no bundle
// inicial do CRM — só baixa no primeiro clique/atalho.
const PainelAssistente = lazy(() => import('@/components/Assistente/PainelAssistente'))

const ATALHO_TECLA = 'i' // Ctrl/Cmd + I

export function AssistenteFlutuante() {
  const [aberto, setAberto] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)

  const abrir = useCallback(() => setAberto(true), [])
  const fechar = useCallback(() => {
    setAberto(false)
    // devolve o foco ao botão que abriu o painel
    botaoRef.current?.focus()
  }, [])

  // Atalho global para abrir (Ctrl/Cmd + I); Esc fecha e devolve o foco
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === ATALHO_TECLA
      ) {
        e.preventDefault()
        abrir()
      } else if (e.key === 'Escape' && aberto) {
        e.preventDefault()
        fechar()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aberto, abrir, fechar])

  return (
    <>
      <Button
        ref={botaoRef}
        onClick={abrir}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className="fixed bottom-6 right-6 z-40 h-11 items-center gap-2 rounded-full bg-teal-700 px-5 font-semibold text-sm text-white shadow-lg hover:bg-teal-800"
      >
        <Sparkles className="h-4 w-4" />
        Assistente
        <kbd className="ml-1 hidden rounded border border-white/40 px-1 font-sans text-[10px] text-white/80 md:inline">
          Ctrl I
        </kbd>
      </Button>

      {aberto && (
        <Suspense
          fallback={
            <div className="fixed inset-y-0 right-0 z-50 flex w-full items-center justify-center border-l border-slate-200 bg-white shadow-2xl md:w-[400px]">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            </div>
          }
        >
          <PainelAssistente aberto={aberto} onFechar={fechar} />
        </Suspense>
      )}
    </>
  )
}
