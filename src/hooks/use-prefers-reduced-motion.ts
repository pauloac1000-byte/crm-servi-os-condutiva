import { useEffect, useState } from 'react'

// Preferência do sistema operacional por movimento reduzido
// (media query prefers-reduced-motion: reduce). Usada pelo Dashboard para
// desligar a animação dos gráficos Recharts (isAnimationActive), que não
// respondem à regra CSS global de movimento reduzido.
export function usePrefersReducedMotion(): boolean {
  const [reduzido, setReduzido] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    const atualizar = () => setReduzido(consulta.matches)
    atualizar()
    consulta.addEventListener('change', atualizar)
    return () => consulta.removeEventListener('change', atualizar)
  }, [])

  return reduzido
}
