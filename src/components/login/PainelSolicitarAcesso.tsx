import { useState } from 'react'
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
import { User, Mail, Phone, Briefcase, CheckCircle2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { criarSolicitacaoAcesso } from '@/services/solicitacoes'
import { AvisoAvaliacao } from '@/components/login/AvisoAvaliacao'

const inputClasse =
  'bg-white border-slate-200 pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]'

type PainelSolicitarAcessoProps = {
  onIrParaEntrar: () => void
}

// Painel de solicitação de acesso mostrado na tela de login (fora das abas
// existentes, que permanecem intactas). Grava em solicitacoes_acesso com
// status pendente; o e-mail ao administrador é disparado pelo hook do backend.
export function PainelSolicitarAcesso({ onIrParaEntrar }: PainelSolicitarAcessoProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [vinculo, setVinculo] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vinculo) {
      toast.error('Selecione seu vínculo com a Condutiva.')
      return
    }

    setLoading(true)
    try {
      await criarSolicitacaoAcesso({ nome, email, telefone, vinculo })
      setEnviado(true)
    } catch {
      toast.error('Não foi possível registrar seu pedido. Tente novamente mais tarde.')
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
          <h4 className="text-sm font-semibold text-slate-900">Pedido registrado!</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Seu pedido de acesso foi registrado e está aguardando avaliação do administrador da
            Condutiva — a liberação ocorre em até 24 horas.
          </p>
        </div>
        <div className="pt-2">
          <Button
            type="button"
            onClick={onIrParaEntrar}
            className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold h-10"
          >
            Voltar para o login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="solicit-nome" className="text-xs font-semibold text-slate-700">
          Nome completo <span className="text-[#84bd22]">*</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="solicit-nome"
            placeholder="Seu nome completo"
            className={inputClasse}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="solicit-email" className="text-xs font-semibold text-slate-700">
          E-mail <span className="text-[#84bd22]">*</span>
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="solicit-email"
            type="email"
            placeholder="seu.email@empresa.com.br"
            className={inputClasse}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="solicit-telefone" className="text-xs font-semibold text-slate-700">
          Telefone de contato <span className="text-[#84bd22]">*</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="solicit-telefone"
            type="tel"
            placeholder="(00) 00000-0000"
            className={inputClasse}
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="solicit-vinculo" className="text-xs font-semibold text-slate-700">
          Vínculo <span className="text-[#84bd22]">*</span>
        </Label>
        <Select value={vinculo} onValueChange={setVinculo}>
          <SelectTrigger id="solicit-vinculo" className="bg-white border-slate-200 text-slate-900">
            <span className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-500" />
              <SelectValue placeholder="Selecione seu vínculo" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="colaborador">Colaborador</SelectItem>
            <SelectItem value="parceiro">Parceiro autorizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AvisoAvaliacao />

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold h-11 shadow-lg shadow-[#84bd22]/20 group transition-all"
      >
        {loading ? 'Enviando...' : 'Enviar solicitação'}
        <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 text-white" />
      </Button>

      <p className="text-center text-xs text-slate-500">
        Já possui acesso?{' '}
        <button
          type="button"
          onClick={onIrParaEntrar}
          className="text-[#84bd22] font-semibold hover:underline"
        >
          Entrar
        </button>
      </p>
    </form>
  )
}
