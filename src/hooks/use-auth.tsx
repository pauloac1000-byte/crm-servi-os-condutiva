import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  aplicarSessaoEmMemoria,
  marcarSessaoAtiva,
  limparMarcadorSessao,
} from '@/lib/pocketbase/sessao'

import { User } from '@/types/crm'

// Sessão viva só enquanto o documento está aberto (nunca persistida em
// localStorage) — fechar a aba/navegador ou voltar pelo navegador encerra.
aplicarSessaoEmMemoria()

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  requestPasswordReset: (email: string) => Promise<{ error: any }>
  confirmPasswordReset: (token: string, password: string) => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(
    pb.authStore.isValid && pb.authStore.record ? (pb.authStore.record as unknown as User) : null,
  )
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  const isAdmin = Boolean(user && user.role === 'admin')

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid && record ? (record as unknown as User) : null)
      setIsAuthenticated(pb.authStore.isValid)
      // Sessão válida em memória: marca que houve login nesta origem (insumo do
      // aviso "sessão encerrada" da tela de login após encerramento automático).
      if (pb.authStore.isValid) marcarSessaoAtiva()
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }

    // Botão voltar do navegador pode reabrir esta página pelo cache do
    // navegador (bfcache), com dados do usuário anterior ainda renderizados.
    // Nesse caso encerramos a sessão e recarregamos direto para o login.
    const aoRestaurarPagina = (evento: PageTransitionEvent) => {
      if (!evento.persisted || !pb.authStore.isValid) return
      pb.authStore.clear()
      window.location.replace('/login')
    }
    window.addEventListener('pageshow', aoRestaurarPagina)

    return () => {
      unsubscribe()
      window.removeEventListener('pageshow', aoRestaurarPagina)
    }
  }, [])

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name || email.split('@')[0],
      })
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    // Logout manual: sem aviso de sessão encerrada (foi escolha do usuário).
    limparMarcadorSessao()
    pb.authStore.clear()
  }

  const requestPasswordReset = async (email: string) => {
    try {
      // In PocketBase, requestPasswordReset sends an email with the reset token
      await pb.collection('users').requestPasswordReset(email)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        confirmPasswordReset,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
