export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role?: UserRole
  created?: string
  updated?: string
  verified?: boolean
}

export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  role?: string
  cidade?: string
  estado?: string
  status: 'lead' | 'prospect' | 'cliente' | 'inativo'
  notes?: string
  owner: string
  created: string
  updated: string
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  created: string
  updated: string
}

// Etapa oficial do funil de SERVIÇOS (coleção "etapas_funil" no Skip Cloud).
// Os textos (nome, objetivo, atividade, critério de saída, prazo) são editáveis
// pela coleção — a interface lê direto dela, ordenado por "ordem", sem hardcode.
export type DealStatus = 'em andamento' | 'ganho' | 'perdido'

export interface EtapaFunil {
  id: string
  ordem: number
  nome: string
  objetivo?: string
  atividade_principal?: string
  criterio_saida?: string
  prazo_alvo_dias?: number
  cor?: string
  created: string
  updated: string
}

export interface Deal {
  id: string
  title: string
  value: number
  stage: string
  // etapa oficial do funil de serviços (coleção etapas_funil)
  etapa?: string
  // etapa em que o negócio parou, quando status = perdido
  etapa_anterior?: string
  status?: DealStatus
  contact: string
  owner: string
  expected_close_date?: string
  priority: 'baixa' | 'média' | 'alta'
  notes?: string
  created: string
  updated: string
  expand?: {
    stage?: PipelineStage
    etapa?: EtapaFunil
    etapa_anterior?: EtapaFunil
    contact?: Contact
    owner?: User
  }
}

export interface Activity {
  id: string
  title: string
  type: 'ligação' | 'e-mail' | 'reunião' | 'follow-up'
  status: 'pendente' | 'concluída'
  description?: string
  due_date?: string
  contact?: string
  deal?: string
  owner: string
  created: string
  updated: string
  expand?: {
    contact?: Contact
    deal?: Deal
    owner?: User
  }
}
