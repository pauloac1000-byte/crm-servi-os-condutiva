import { EtapaFunil } from '@/types/crm'

// A etapa 6 do funil de serviços é o "Compromisso" — o momento em que o
// contrato pode ser registrado. Resolve pela coleção etapas_funil (ordem 6),
// com fallback pelo nome, sem depender de IDs fixos.
export const getEtapaCompromisso = (stages?: EtapaFunil[]): EtapaFunil | undefined => {
  if (!stages || stages.length === 0) return undefined
  return (
    stages.find((s) => s.ordem === 6) ||
    stages.find((s) => (s.nome || '').toLowerCase().includes('compromisso'))
  )
}
