import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, ArrowRight, UserPlus, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { CampoSenha, ContainerCampo, RotuloObrigatorio } from '@/components/login/campo-senha'
import { criarSolicitacaoAcesso } from '@/services/solicitacoes'
import { AvisoAvaliacao } from '@/components/login/AvisoAvaliacao'
import type { AbaLogin } from '@/components/login/abas-login'

type AbaPrimeiroAcessoProps = {
  onIrPara: (aba: AbaLogin) => void
  // Mantido por compatibilidade com a tela de login (não é mais chamado:
  // o cadastro agora cria pedido de acesso, sem autenticar na hora).
  onEnviado?: () => void
}

// Aba "Primeiro Acesso": cria um pedido em solicitacoes_acesso (status
// pendente) em vez de autenticar na hora — o acesso é liberado pelo
// administrador da Condutiva em até 24 horas.
export function AbaPrimeiroAcesso({ onIrPara, onEnviado }: AbaPrimeiroAcessoProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      await criarSolicitacaoAcesso({ nome, email, telefone: '', vinculo: 'colaborador' })
      setEnviado(true)
      onEnviado?.()
    } catch {
      toast.error('Erro ao registrar pedido. Verifique os dados informados.')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="space-y-4 py-8 text-center animate-fade-in-up">
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
            onClick={() => onIrPara('entrar')}
            className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold h-10"
          >
            Voltar para o login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      onReset={() => {
        setPassword('')
        setConfirmPassword('')
      }}
    >
      <div className="space-y-4 pt-4">
        <ContainerCampo>
          <RotuloObrigatorio htmlFor="signup-nome">Nome Completo</RotuloObrigatorio>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="signup-nome"
              placeholder="Seu nome"
              className="bg-white border-slate-200 pl-9 pr-3 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        </ContainerCampo>

        <ContainerCampo>
          <RotuloObrigatorio htmlFor="signup-email">E-mail corporativo</RotuloObrigatorio>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="signup-email"
              type="email"
              placeholder="seu.email@condutiva.com.br"
              className="bg-white border-slate-200 pl-9 pr-3 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </ContainerCampo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampoSenha
            id="signup-password"
            label="Senha"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <CampoSenha
            id="signup-confirmPassword"
            label="Confirmar"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="pt-5">
        <AvisoAvaliacao />
      </div>

      <div className="flex flex-col space-y-4 pt-5">
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold h-11 shadow-lg shadow-[#84bd22]/20 group transition-all"
        >
          {loading ? 'Criando conta...' : 'cadastrar acesso'}
          <UserPlus className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 text-white" />
        </Button>

        <p className="text-center text-xs text-slate-500">
          Já tem uma conta?{' '}
          <button
            type="button"
            onClick={() => onIrPara('entrar')}
            className="text-[#84bd22] font-semibold hover:underline"
          >
            Faça Login
          </button>
          <ArrowRight className="inline-block ml-1 h-3 w-3 text-[#84bd22]" />
        </p>
      </div>
    </form>
  )
}
