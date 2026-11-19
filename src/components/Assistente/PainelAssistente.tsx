import { useEffect, useRef, useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { perguntarAssistente } from '@/services/assistente'

// Assistente de IA do CRM. Painel lateral fixo à direita (400px) que SOBREPÕE o
// conteúdo (position fixed, não empurra o layout) e vira tela cheia abaixo de 768px (md).
// A pergunta vai à rota de servidor /backend/v1/assistente-ia (a chave fica no backend).

interface Mensagem {
  id: number
  papel: 'usuario' | 'assistente'
  texto: string
  // quando true, mostra o indicador "pensando" no lugar do texto
  pendente?: boolean
}

interface Props {
  aberto: boolean
  onFechar: () => void
}

// Enquanto o painel está fechado, o lazy load já pode ter disparado: o componente
// mantém o histórico em memória, mas devolve o foco ao botão que o abriu ao fechar.
export default function PainelAssistente({ aberto, onFechar }: Props) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)
  const campoRef = useRef<HTMLInputElement>(null)
  const proximoId = useRef(1)

  // rolar para a última mensagem
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [mensagens])

  // foco no campo quando o painel abre; limpa o temporizador ao desmontar
  useEffect(() => {
    if (aberto) {
      const t = setTimeout(() => campoRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [aberto])

  if (!aberto) return null

  const enviar = async () => {
    const pergunta = texto.trim()
    if (!pergunta || pensando) return

    const idPergunta = proximoId.current++
    const idResposta = idPergunta + 1
    setMensagens((atual) => [
      ...atual,
      { id: idPergunta, papel: 'usuario', texto: pergunta },
      // placeholder "pensando" que será substituído pela resposta
      { id: idResposta, papel: 'assistente', texto: '', pendente: true },
    ])
    setTexto('')
    setPensando(true)
    proximoId.current = idResposta + 1

    try {
      const resposta = await perguntarAssistente(pergunta)
      setMensagens((atual) =>
        atual.map((m) => (m.id === idResposta ? { ...m, texto: resposta, pendente: false } : m)),
      )
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível obter resposta do assistente.'
      setMensagens((atual) =>
        atual.map((m) => (m.id === idResposta ? { ...m, texto: msg, pendente: false } : m)),
      )
    } finally {
      setPensando(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assistente de IA"
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl md:w-[400px]"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-slate-800">Assistente</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Fechar assistente"
          onClick={onFechar}
          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {mensagens.length === 0 && (
          <p className="text-sm text-slate-400">Faça uma pergunta ao assistente.</p>
        )}

        {mensagens.map((m) => (
          <div
            key={m.id}
            className={cn('flex w-full', m.papel === 'usuario' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                m.papel === 'usuario'
                  ? 'bg-teal-700 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-800',
              )}
            >
              {m.pendente ? (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Pensando…
                </span>
              ) : (
                m.texto
              )}
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      {/* Campo de pergunta */}
      <div className="border-t border-slate-200 px-4 py-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            enviar()
          }}
        >
          <input
            ref={campoRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Digite sua pergunta…"
            aria-label="Sua pergunta"
            className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
          <Button
            type="submit"
            className="h-10 bg-teal-700 px-4 font-semibold text-xs text-white hover:bg-teal-800 disabled:opacity-50"
            disabled={!texto.trim() || pensando}
          >
            Enviar
          </Button>
        </form>
        <p className="mt-2 text-[11px] text-slate-400">
          As perguntas são enviadas ao assistente de IA configurado.
        </p>
      </div>
    </div>
  )
}
