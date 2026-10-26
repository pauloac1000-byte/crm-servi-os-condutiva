import { useState, useEffect } from 'react'
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
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(4)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    token?: string
    password?: string
    confirmPassword?: string
  }>({})

  // Automatically update token if search param changes
  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
    }
  }, [tokenFromUrl])

  // Countdown and automatic redirection after success
  useEffect(() => {
    if (!success) return

    setCountdown(4)
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          navigate('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [success, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    const errors: typeof fieldErrors = {}

    const activeToken = token.trim()
    if (!activeToken) {
      errors.token = 'Token de redefinição não encontrado. Verifique o link recebido por e-mail.'
    }

    if (!password) {
      errors.password = 'Informe a nova senha.'
    } else if (password.length < 8) {
      errors.password = 'A nova senha deve ter no mínimo 8 caracteres.'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirme a nova senha.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem. Digite exatamente a mesma senha.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstError = errors.token || errors.password || errors.confirmPassword
      if (firstError) toast.error(firstError)
      return
    }

    setFieldErrors({})
    setLoading(true)
    const { error } = await confirmPasswordReset(activeToken, password)
    setLoading(false)

    if (error) {
      const rawMsg = (error as any)?.data?.message || (error as any)?.message || ''

      let friendlyMsg =
        'Link inválido ou expirado. Por favor, solicite um novo link de redefinição de senha.'

      if (typeof rawMsg === 'string' && rawMsg.toLowerCase().includes('token')) {
        friendlyMsg = 'Link inválido ou expirado. Solicite um novo link de redefinição.'
      } else if (
        typeof rawMsg === 'string' &&
        rawMsg.length > 0 &&
        !rawMsg.includes('Failed to authenticate')
      ) {
        friendlyMsg = rawMsg
      }

      setErrorMessage(friendlyMsg)
      toast.error(friendlyMsg)
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
            <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              {success ? (
                <>
                  <span>Senha redefinida com sucesso</span>
                  <span aria-hidden="true">✅</span>
                </>
              ) : (
                'Redefinição de Senha'
              )}
            </CardTitle>
            <CardDescription className="text-[#84bd22] font-semibold text-xs tracking-widest uppercase mt-1">
              {success ? 'Acesso Atualizado' : 'Defina sua nova senha de acesso'}
            </CardDescription>
          </div>
        </CardHeader>

        {success ? (
          <CardContent className="space-y-5 pt-4 text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#84bd22]/15 border-2 border-[#84bd22] text-[#84bd22] shadow-lg shadow-[#84bd22]/20">
              <CheckCircle2 className="h-10 w-10 text-[#84bd22]" />
              <div className="absolute -top-1 -right-1 bg-[#84bd22] rounded-full p-1 text-slate-950">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="rounded-xl border border-[#84bd22]/30 bg-[#84bd22]/10 p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-[#84bd22] font-semibold text-sm">
                <span>Tudo certo com a sua conta!</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sua senha foi alterada com sucesso. Agora você já pode fazer login no{' '}
                <strong className="text-white font-medium">Sistema de Vendas Condutiva</strong>{' '}
                utilizando a nova senha cadastrada.
              </p>
            </div>

            <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg py-2.5 px-3 flex items-center justify-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#84bd22] animate-pulse" />
              <span>
                Redirecionando para o login em{' '}
                <strong className="text-white font-bold">{countdown}</strong>{' '}
                {countdown === 1 ? 'segundo' : 'segundos'}...
              </span>
            </div>

            <div className="pt-1">
              <Button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-slate-950 font-bold h-11 shadow-lg shadow-[#84bd22]/20 text-sm transition-all"
              >
                Ir para o login agora
                <ArrowRight className="ml-2 h-4 w-4 text-slate-950" />
              </Button>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4 pt-4">
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <span className="font-semibold block text-red-300">
                      Não foi possível redefinir sua senha
                    </span>
                    <p className="leading-relaxed">{errorMessage}</p>
                    <div className="pt-1">
                      <Link
                        to="/forgot-password"
                        className="inline-flex items-center gap-1.5 text-xs text-[#84bd22] hover:underline font-semibold"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Solicitar novo link de redefinição
                      </Link>
                    </div>
                  </div>
                </div>
              )}

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
                      placeholder="Cole aqui o token recebido no e-mail"
                      className={`bg-slate-950/80 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-[#84bd22] ${
                        fieldErrors.token
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : 'border-slate-800'
                      }`}
                      value={token}
                      onChange={(e) => {
                        setToken(e.target.value)
                        if (fieldErrors.token) {
                          setFieldErrors((prev) => ({ ...prev, token: undefined }))
                        }
                      }}
                      required
                    />
                  </div>
                  {fieldErrors.token && (
                    <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {fieldErrors.token}
                    </p>
                  )}
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
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo de 8 caracteres"
                    className={`bg-slate-950/80 pl-9 pr-10 text-white placeholder:text-slate-600 focus-visible:ring-[#84bd22] ${
                      fieldErrors.password
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : 'border-slate-800'
                    }`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }))
                      }
                    }}
                    required
                    minLength={8}
                    autoFocus={!!tokenFromUrl}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.password}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Use pelo menos 8 caracteres para garantir a segurança da conta.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-slate-300 text-xs font-semibold">
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repita a nova senha"
                    className={`bg-slate-950/80 pl-9 pr-10 text-white placeholder:text-slate-600 focus-visible:ring-[#84bd22] ${
                      fieldErrors.confirmPassword
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : 'border-slate-800'
                    }`}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                      }
                    }}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                    aria-label={
                      showConfirmPassword
                        ? 'Ocultar confirmação da senha'
                        : 'Exibir confirmação da senha'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-slate-950 font-bold h-11 shadow-lg shadow-[#84bd22]/20 group transition-all"
              >
                {loading ? 'Salvando nova senha...' : 'Salvar Nova Senha'}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 text-slate-950" />
              </Button>

              <div className="flex flex-col items-center gap-1.5 text-center text-xs text-slate-400">
                <p>
                  Lembrou da senha?{' '}
                  <Link to="/login" className="text-[#84bd22] font-semibold hover:underline">
                    Voltar ao login
                  </Link>
                </p>
                <p>
                  Problemas com o link?{' '}
                  <Link to="/forgot-password" className="text-slate-300 hover:text-white underline">
                    Solicitar novo link
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
