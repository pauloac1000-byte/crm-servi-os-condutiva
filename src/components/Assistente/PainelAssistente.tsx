import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Sparkles, Loader2, Copy, Check, Plus, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  perguntarAssistente,
  carregarConversas,
  carregarTrocas,
  type TrocaAssistente,
} from '@/services/assistente'
import { formatarRespostaAssistente } from '@/lib/assistente-formatar'
import { sugestoesAssistente } from '@/lib/assistente-sugestoes'

// Assistente de IA do CRM. Painel lateral fixo à direita (400px) que SOBREPÕE o
// conteúdo (position fixed, não empurra o layout) e vira tela cheia abaixo de 768px (md).
// A pergunta vai à rota de servidor /backend/v1/assistente-ia (a chave fica no backend).
//
// Persistência: cada troca fica na coleção assistente_conversas (migration 0034).
// Ao abrir, o painel recarrega a última conversa do usuário; "nova conversa" começa
// um identificador novo (as anteriores continuam gravadas). Nenhum HTML cru é
// renderizado — a resposta passa pelo conversor próprio (assistente-formatar).

interface Mensagem {
  id: string
  papel: 'usuario' | 'assistente'
  texto: string
  // quando true, mostra o indicador "pensando" no lugar do texto
  pendente?: boolean
}

interface Props {
  aberto: boolean
  onFechar: () => void
}

const novoIdLocal = () => 'local-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
const novaConversaId = () => 'c' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export default function PainelAssistente({ aberto, onFechar }: Props) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [conversaId, setConversaId] = useState<string>(() => novaConversaId())
  const [carregando, setCarregando] = useState(false)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [copiadoId, setCopiadoId] = useState<string | null>(null)
  const [caminho, setCaminho] = useState(window.location.pathname)
  const fimRef = useRef<HTMLDivElement>(null)
  const campoRef = useRef<HTMLInputElement>(null)
  // conversaId vigente para o envio em curso (evita enviar o id novo após "nova conversa")
  const conversaRef = useRef(conversaId)

  const definirConversa = useCallback((id: string) => {
    conversaRef.current = id
    setConversaId(id)
  }, [])

  // rolar para a última mensagem
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [mensagens, carregando])

  // foco no campo quando o painel abre
  useEffect(() => {
    if (aberto) {
      const t = setTimeout(() => campoRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [aberto])

  // sugestões seguem a página aberta (atualiza quando o painel reabre)
  useEffect(() => {
    if (aberto) setCaminho(window.location.pathname)
  }, [aberto])

  // ao abrir: carrega a última conversa gravada do usuário (a mais recente por data)
  useEffect(() => {
    if (!aberto) return
    let vivo = true
    setCarregando(true)
    ;(async () => {
      try {
        const trocas = await carregarConversas(1)
        if (!vivo) return
        if (trocas.length) {
          definirConversa(trocas[0].conversaId)
          const daConversa = await carregarTrocas(trocas[0].conversaId)
          if (!vivo) return
          const vinda: Mensagem[] = []
          for (const t of daConversa) {
            vinda.push({ id: 'p' + t.id, papel: 'usuario', texto: t.pergunta })
            vinda.push({ id: 'r' + t.id, papel: 'assistente', texto: t.resposta })
          }
          setMensagens(vinda)
        } else {
          // sem histórico: conversa nova em branco
          definirConversa(novaConversaId())
          setMensagens([])
        }
      } catch {
        // falha de leitura (rede/regra): painel abre vazio, sem travar
        if (vivo) {
          definirConversa(novaConversaId())
          setMensagens([])
        }
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [aberto, definirConversa])

  if (!aberto) return null

  const enviar = async (perguntaPronta?: string) => {
    const pergunta = (perguntaPronta ?? texto).trim()
    if (!pergunta || pensando || carregando) return

    const idPergunta = novoIdLocal()
    const idResposta = novoIdLocal()
    const idConversa = conversaRef.current
    setMensagens((atual) => [
      ...atual,
      { id: idPergunta, papel: 'usuario', texto: pergunta },
      // placeholder "pensando" que será substituído pela resposta
      { id: idResposta, papel: 'assistente', texto: '', pendente: true },
    ])
    setTexto('')
    setPensando(true)

    try {
      const r = await perguntarAssistente(pergunta, idConversa)
      // o servidor pode ter gerado um id novo (pergunta sem conversa_id): adota
      if (r.conversaId) definirConversa(r.conversaId)
      setMensagens((atual) =>
        atual.map((m) => (m.id === idResposta ? { ...m, texto: r.resposta, pendente: false } : m)),
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

  // nova conversa: limpa o painel; a próxima pergunta envia um id novo e as
  // anteriores continuam gravadas na coleção
  const novaConversa = () => {
    if (pensando || carregando) return
    definirConversa(novaConversaId())
    setMensagens([])
    setTexto('')
    campoRef.current?.focus()
  }

  const copiarResposta = async (m: Mensagem) => {
    try {
      await navigator.clipboard.writeText(m.texto)
      setCopiadoId(m.id)
      setTimeout(() => setCopiadoId((atual) => (atual === m.id ? null : atual)), 2000)
    } catch {
      // sem permissão de clipboard: não há fallback simples; ignora silenciosamente
    }
  }

  const sugestoes = sugestoesAssistente(caminho)
  const painelVazio = !carregando && mensagens.length === 0

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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Nova conversa"
            title="Nova conversa"
            onClick={novaConversa}
            className="h-8 gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </Button>
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
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {carregando && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Carregando conversa…
          </p>
        )}

        {painelVazio && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Faça uma pergunta ao assistente.</p>
            <p className="text-xs font-medium text-slate-500">Sugestões para esta página:</p>
            <div className="space-y-2">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:border-teal-600 hover:bg-teal-50"
                >
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                  {s}
                </button>
              ))}
            </div>
          </div>
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
              ) : m.papel === 'assistente' ? (
                <div className="space-y-1">
                  <div className="break-words">{formatarRespostaAssistente(m.texto)}</div>
                  <button
                    type="button"
                    aria-label="Copiar resposta"
                    title="Copiar resposta"
                    onClick={() => copiarResposta(m)}
                    className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-700"
                  >
                    {copiadoId === m.id ? (
                      <>
                        <Check className="h-3 w-3 text-teal-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>
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
