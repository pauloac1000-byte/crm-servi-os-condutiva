import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { Lock, Mail, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import logoImg from '@/assets/logo-removebg-previewedited-6e100.jpg'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast.error('Credenciais inválidas. Verifique seu e-mail e senha.')
    } else {
      toast.success('Bem-vindo de volta!')
      navigate('/')
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
              Painel de Vendas
            </CardTitle>
            <CardDescription className="text-[#84bd22] font-semibold text-xs tracking-widest uppercase mt-1">
              Acesse sua conta para continuar
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
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
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 text-xs font-semibold">
                  Senha
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-slate-950/80 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-[#84bd22]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 text-slate-950" />
            </Button>

            <p className="text-center text-xs text-slate-400">
              Não possui uma conta?{' '}
              <Link to="/signup" className="text-[#84bd22] font-semibold hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
