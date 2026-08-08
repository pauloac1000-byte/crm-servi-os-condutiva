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
import { Zap, User, Mail, Lock, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
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
    const { error } = await signUp(email, password, name)
    setLoading(false)

    if (error) {
      toast.error('Erro ao criar conta. Verifique os dados informados.')
    } else {
      toast.success('Conta criada com sucesso! Bem-vindo.')
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 font-sans relative overflow-hidden">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-teal-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

      <Card className="w-full max-w-md border-slate-800 bg-slate-950/80 text-white shadow-2xl backdrop-blur-xl animate-fade-in-up">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/30">
            <Zap className="h-7 w-7 fill-current" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tight text-white">
              Nova Conta
            </CardTitle>
            <CardDescription className="text-teal-400 font-semibold text-xs tracking-widest uppercase">
              Condutiva Vendas
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-slate-300 text-xs font-semibold">
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="name"
                  placeholder="Seu nome"
                  className="bg-slate-900/90 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-teal-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-slate-300 text-xs font-semibold">
                E-mail corporativo
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@condutiva.com.br"
                  className="bg-slate-900/90 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-teal-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="password" className="text-slate-300 text-xs font-semibold">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-slate-900/90 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-teal-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-slate-300 text-xs font-semibold">
                  Confirmar
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="bg-slate-900/90 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-teal-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold h-11 shadow-lg shadow-teal-600/20 group"
            >
              {loading ? 'Criando conta...' : 'Cadastrar e Acessar'}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>

            <p className="text-center text-xs text-slate-400">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-teal-400 font-semibold hover:underline">
                Faça Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
