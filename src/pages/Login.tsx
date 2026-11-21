import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Lock, Mail, ArrowRight, CheckCircle2, Send, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import logoImg from '@/assets/logo-removebg-previewedited-6e100.jpg'
import { AbasLogin, type AbaLogin } from '@/components/login/abas-login'
import { AbaPrimeiroAcesso } from '@/components/login/AbaPrimeiroAcesso'
import { AbaRedefinir } from '@/components/login/AbaRedefinir'

const inputClasse =
  'bg-white border-slate-200 pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, requestPasswordReset } = useAuth()
  const [aba, setAba] = useState<AbaLogin>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const trocarAba = (novaAba: AbaLogin) => {
    setAba(novaAba)
    setMostrarSenha(false) // campo de senha volta a ficar oculto ao trocar de aba
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)
    setMostrarSenha(false) // volta a ocultar após enviar
    setLoading(false)

    if (error) {
      toast.error('Credenciais inválidas. Verifique seu e-mail e senha.')
    } else {
      toast.success('Bem-vindo de volta!')
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans relative overflow-hidden">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#84bd22]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-slate-200/50 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-slate-200 bg-white text-slate-900 shadow-xl backdrop-blur-xl animate-fade-in-up">
        <CardHeader className="space-y-4 text-center pb-2 pt-6">
          <div className="mx-auto flex items-center justify-center rounded-2xl bg-white p-3.5 shadow-lg border border-slate-100 max-w-[260px] w-full">
            <img
              src={logoImg}
              alt="Condutiva Tecnologia"
              className="h-11 sm:h-12 w-auto object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
              Painel de Vendas
            </CardTitle>
            <CardDescription className="text-[#74a91e] font-semibold text-xs tracking-widest uppercase mt-1">
              Acesse sua conta para continuar
            </CardDescription>
          </div>
          <AbasLogin abaAtiva={aba} onTrocarAba={trocarAba} />
        </CardHeader>

        {aba === 'entrar' && (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  E-mail corporativo <span className="text-[#84bd22]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@condutiva.com.br"
                    className={inputClasse}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Senha <span className="text-[#84bd22]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email)
                      setResetSuccess(false)
                      setForgotOpen(true)
                    }}
                    className="text-xs text-[#84bd22] hover:underline focus:outline-none focus:ring-1 focus:ring-[#84bd22] rounded px-1 transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="bg-white border-slate-200 pl-9 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#84bd22]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#84bd22]"
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold h-11 shadow-lg shadow-[#84bd22]/20 group transition-all"
              >
                {loading ? 'Entrando...' : 'Entrar no Sistema'}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 text-white" />
              </Button>

              <p className="text-center text-xs text-slate-500">
                Não possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => trocarAba('primeiro-acesso')}
                  className="text-[#84bd22] font-semibold hover:underline"
                >
                  Criar conta
                </button>
              </p>
            </CardFooter>
          </form>
        )}

        {aba === 'primeiro-acesso' && (
          <CardContent className="pt-0">
            <AbaPrimeiroAcesso onIrPara={trocarAba} onEnviado={() => navigate('/')} />
          </CardContent>
        )}

        {aba === 'redefinir' && (
          <AbaRedefinir onIrPara={trocarAba} onEnviado={() => navigate('/')} />
        )}
      </Card>

      <Dialog
        open={forgotOpen}
        onOpenChange={(open) => {
          setForgotOpen(open)
          if (!open) setResetSuccess(false)
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-900 sm:max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#84bd22]" />
              Recuperar Senha
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Digite seu e-mail cadastrado. Se houver uma conta associada, você receberá um link
              para redefinir sua senha com segurança.
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4 py-3 text-center animate-fade-in-up">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#84bd22]/20 border border-[#84bd22]/40 text-[#74a91e]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-900">E-mail enviado!</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enviamos um link de redefinição para{' '}
                  <strong className="text-[#74a91e] font-semibold">{resetEmail}</strong>. Verifique
                  sua caixa de entrada e pasta de spam.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold h-10"
                >
                  Entendi, fechar
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const trimmed = resetEmail.trim()
                if (!trimmed) {
                  toast.error('Informe seu e-mail cadastrado.')
                  return
                }

                setResetLoading(true)
                const { error } = await requestPasswordReset(trimmed)
                setResetLoading(false)

                if (error) {
                  // In some setups, PB returns error if user not found, or fails on SMTP
                  const msg =
                    (error as any)?.message ||
                    'Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.'
                  toast.error(msg)
                } else {
                  setResetSuccess(true)
                  toast.success('Enviamos um link de redefinição para seu e-mail.')
                }
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="text-xs font-semibold text-slate-700">
                  E-mail cadastrado <span className="text-[#84bd22]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu.email@condutiva.com.br"
                    className={inputClasse}
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotOpen(false)}
                  className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={resetLoading}
                  className="bg-[#84bd22] hover:bg-[#74a91e] text-white font-bold text-xs h-10 px-4 shadow-md shadow-[#84bd22]/20"
                >
                  {resetLoading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                  <Send className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
