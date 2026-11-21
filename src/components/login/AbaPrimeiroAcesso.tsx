import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, ArrowRight, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { CampoSenha, ContainerCampo, RotuloObrigatorio } from '@/components/login/campo-senha'
import type { AbaLogin } from '@/components/login/abas-login'

type AbaPrimeiroAcessoProps = {
  onIrPara: (aba: AbaLogin) => void
  onEnviado: () => void
}

export function AbaPrimeiroAcesso({ onIrPara, onEnviado }: AbaPrimeiroAcessoProps) {
  const { signUp } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
    const { error } = await signUp(email, password, nome)
    setLoading(false)

    if (error) {
      toast.error('Erro ao criar conta. Verifique os dados informados.')
    } else {
      toast.success('Conta criada com sucesso! Bem-vindo.')
      onEnviado()
    }
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
