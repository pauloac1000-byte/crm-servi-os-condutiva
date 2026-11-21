import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { User, Mail, MessageSquare, CheckCircle2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { criarSolicitacaoSuporte } from '@/services/solicitacoes'

const inputClasse =
  'bg-white border-slate-200 pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]'

type FormularioSuporteProps = {
  // Volta ao painel de solicitação de acesso (usado no /login)
  onVoltarSolicitacao?: () => void
  // Volta ao painel interno do CRM (usado dentro do sistema)
  onVoltarInterno?: () => void
  rotuloVoltar?: string
  preencherNome?: string
  preencherContato?: string
}

// Formulário de suporte: grava em solicitacoes_suporte; o e-mail ao
// administrador é disparado pelo hook existente no backend.
export function FormularioSuporte({
  onVoltarSolicitacao,
  onVoltarInterno,
  rotuloVoltar = 'Voltar',
  preencherNome = '',
  preencherContato = '',
}: FormularioSuporteProps) {
  const [nome, setNome] = useState(preencherNome)
  const [contato, setContato] = useState(preencherContato)
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await criarSolicitacaoSuporte({ nome, contato, descricao })
      setEnviado(true)
      setDescricao('')
      setNome('')
      setContato('')
    } catch {
      toast.error('Não foi possível enviar sua solicitação. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="space-y-4 py-6 text-center animate-fade-in-up">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#84bd22]/20 border border-[#84bd22]/40 text-[#74a91e]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold text-slate-900">Solicitação enviada!</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Recebemos sua mensagem e o administrador da Condutiva vai respondê-lo pelo contato
            informado o mais breve possível.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => setEnviado(false)}
            className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold h-10"
          >
            Enviar outra solicitação
          </Button>
          {onVoltarSolicitacao && (
            <Button
              type="button"
              variant="outline"
              onClick={onVoltarSolicitacao}
              className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 h-10"
            >
              Voltar para a solicitação de acesso
            </Button>
          )}
          {onVoltarInterno && (
            <Button
              type="button"
              variant="outline"
              onClick={onVoltarInterno}
              className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 h-10"
            >
              {rotuloVoltar}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="suporte-nome" className="text-xs font-semibold text-slate-700">
          Seu nome <span className="text-[#84bd22]">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="suporte-nome"
            placeholder="Seu nome"
            className={inputClasse}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="suporte-contato" className="text-xs font-semibold text-slate-700">
          Contato (e-mail ou telefone) <span className="text-[#84bd22]">*</span>
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="suporte-contato"
            placeholder="E-mail ou telefone para retorno"
            className={inputClasse}
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="suporte-descricao" className="text-xs font-semibold text-slate-700">
          Descrição do problema <span className="text-[#84bd22]">*</span>
        </Label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Textarea
            id="suporte-descricao"
            rows={4}
            placeholder="Descreva o problema que você está enfrentando"
            className="bg-white border-slate-200 pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {(onVoltarSolicitacao || onVoltarInterno) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (onVoltarSolicitacao) onVoltarSolicitacao()
              else onVoltarInterno?.()
            }}
            className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs"
          >
            {rotuloVoltar}
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold h-10 px-4 shadow-md shadow-[#84bd22]/20"
        >
          {loading ? 'Enviando...' : 'Enviar'}
          <Send className="ml-2 h-3.5 w-3.5 text-white" />
        </Button>
      </div>
    </form>
  )
}
