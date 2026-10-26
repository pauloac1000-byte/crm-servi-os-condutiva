import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Lock, ArrowRight, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import logoImg from '@/assets/logo-removebg-previewedited-6e100.jpg'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { confirmPasswordReset } = useAuth()

  // Token can come from query param (?token=xxx)
  const tokenFromUrl = searchParams.get('token') || ''
  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const activeToken = token.trim()
    if (!activeToken) {
      toast.error('Token de redefinição não encontrado. Verifique o link recebido por e-mail.')
      return
    }

    if (password.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await confirmPasswordReset(activeToken, password)
    setLoading(false)

    if (error) {
      const msg =
        (error as any)?.message ||
        'Token inválido ou expirado. Por favor, solicite um novo link de redefinição.'
      toast.error(msg)
    } else {
      setSuccess(true)
      toast.success('Senha redefinida com sucesso!')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans relative overflow-hidden">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#84bd22]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-slate-800/30 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-xl animate-fade-in-up">
        <CardHeader className="space-y-4 text-center pb-2 pt-6">
          <div className="mx-auto flex items-center justify-center rounded-2xl bg-white p-3.5 shadow-lg border border-slate-100 max-w-[260px] w-full">
            <img
              src={logoImg}
              alt="Condutiva Tecnologia"
              className="h-11 sm:h-12 w-auto object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-white">
              Redefinição de Senha
            </CardTitle>
            <CardDescription className="text-[#84bd22] font-semibold text-xs tracking-widest uppercase mt-1">
              {success ? 'Senha alterada' : 'Defina sua nova senha de acesso'}
            </CardDescription>
          </div>
        </CardHeader>

        {success ? (
          <CardContent className="space-y-4 pt-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#84bd22]/20 border border-[#84bd22]/40 text-[#84bd22]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">Tudo pronto!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sua senha foi redefinida com sucesso. Agora você já pode fazer login no Painel de
                Vendas da Condutiva com suas novas credenciais.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-slate-950 font-bold h-11 shadow-lg shadow-[#84bd22]/20"
              >
                Ir para o Login
                <ArrowRight className="ml-2 h-4 w-4 text-slate-950" />
              </Button>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              {!tokenFromUrl && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-300">
                      Token não detectado na URL
                    </span>
                    Insira o código/token recebido por e-mail no campo abaixo ou abra diretamente o
                    link completo enviado na mensagem.
                  </div>
                </div>
              )}

              {!tokenFromUrl && (
                <div className="space-y-1.5">
                  <Label htmlFor="token" className="text-slate-300 text-xs font-semibold">
                    Token de redefinição
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="token"
                      type="text"
                      placeholder="Cole aqui o token do e-mail"
                      className="bg-slate-950/80 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-[#84bd22]"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300 text-xs font-semibold">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo de 8 caracteres"
                    className="bg-slate-950/80 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-[#84bd22]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-slate-300 text-xs font-semibold">
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repita a nova senha"
                    className="bg-slate-950/80 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-[#84bd22]"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-slate-950 font-bold h-11 shadow-lg shadow-[#84bd22]/20 group transition-all"
              >
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 text-slate-950" />
              </Button>

              <p className="text-center text-xs text-slate-400">
                Lembrou da senha?{' '}
                <Link to="/login" className="text-[#84bd22] font-semibold hover:underline">
                  Voltar ao login
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
