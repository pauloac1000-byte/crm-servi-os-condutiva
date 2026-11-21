import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, KeyRound, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ClientResponseError } from 'pocketbase'
import { CampoSenha, ContainerCampo, RotuloObrigatorio } from '@/components/login/campo-senha'
import type { AbaLogin } from '@/components/login/abas-login'

type AbaRedefinirProps = {
  onIrPara: (aba: AbaLogin) => void
  onEnviado: () => void
}

export function AbaRedefinir({ onIrPara, onEnviado }: AbaRedefinirProps) {
  const [email, setEmail] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)

  const mensagemErro = (error: unknown): string => {
    if (error instanceof ClientResponseError) {
      const data = error.response?.data as Record<string, { message?: string }> | undefined
      const msgs = data
        ? Object.values(data)
            .map((d) => d?.message)
            .filter(Boolean)
        : []
      if (msgs.length > 0) return msgs.join(' ')
      return error.message
    }
    return 'Não foi possível salvar a nova senha. Tente novamente.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (novaSenha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      // valida a senha atual contra o PocketBase antes de salvar
      await pb.collection('users').authWithPassword(email.trim(), senhaAtual)
      await pb.collection('users').update(pb.authStore.record!.id, {
        password: novaSenha,
        passwordConfirm: novaSenha,
        oldPassword: senhaAtual,
      })
      toast.success('Nova senha salva com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      onEnviado()
    } catch (error) {
      toast.error(mensagemErro(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 pt-4">
        <ContainerCampo>
          <RotuloObrigatorio htmlFor="reset-id">E-mail corporativo</RotuloObrigatorio>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="reset-id"
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

        <CampoSenha
          id="reset-senha-atual"
          label="Senha atual"
          value={senhaAtual}
          onChange={setSenhaAtual}
          autoComplete="current-password"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampoSenha
            id="reset-nova-senha"
            label="Nova senha"
            value={novaSenha}
            onChange={setNovaSenha}
            autoComplete="new-password"
          />
          <CampoSenha
            id="reset-confirmar-senha"
            label="Confirmar nova senha"
            value={confirmarSenha}
            onChange={setConfirmarSenha}
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
          {loading ? 'Salvando...' : 'salvar nova senha'}
          <Save className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 text-white" />
        </Button>

        <p className="text-center text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onIrPara('entrar')}
            className="text-[#84bd22] font-semibold hover:underline"
          >
            Voltar ao login
          </button>
        </p>
      </div>
    </form>
  )
}
