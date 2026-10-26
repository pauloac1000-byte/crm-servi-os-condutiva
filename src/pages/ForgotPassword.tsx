import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Mail, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import logoImg from '@/assets/logo-removebg-previewedited-6e100.jpg'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error('Informe seu e-mail cadastrado.')
      return
    }

    setLoading(true)
    const { error } = await requestPasswordReset(trimmed)
    setLoading(false)

    if (error) {
      const msg =
        (error as any)?.message ||
        'Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.'
      toast.error(msg)
    } else {
      setSent(true)
      toast.success('Enviamos um link de redefinição para seu e-mail.')
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
              Recuperar Senha
            </CardTitle>
            <CardDescription className="text-[#84bd22] font-semibold text-xs tracking-widest uppercase mt-1">
              {sent ? 'Link Enviado' : 'Instruções por e-mail'}
            </CardDescription>
          </div>
        </CardHeader>

        {sent ? (
          <CardContent className="space-y-4 pt-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#84bd22]/20 border border-[#84bd22]/40 text-[#84bd22]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">E-mail enviado!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enviamos um link de redefinição para{' '}
                <strong className="text-[#84bd22] font-semibold">{email}</strong>. Siga as
                instruções recebidas para cadastrar sua nova senha.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login">
                <Button className="w-full bg-[#84bd22] hover:bg-[#74a91e] text-slate-950 font-bold h-11 shadow-lg shadow-[#84bd22]/20">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Digite o e-mail associado à sua conta. Se houver cadastro, você receberá um link
                para redefinir a senha com segurança.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-xs font-semibold">
                  E-mail corporativo
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@condutiva.com.br"
                    className="bg-slate-950/80 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-[#84bd22]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
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
                {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
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
