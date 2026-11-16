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
  // itens do critério de saída — um por caixa de confirmação na tela do negócio
  criterio_itens?: string[]
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
  // itens do critério de saída da etapa atual já confirmados (texto do item)
  criterio_marcados?: string[]
  // justificativa gravada quando o admin força o avanço de etapa
  justificativa_avanco?: string
  // sinaliza ao hook do backend que o admin está forçando o avanço (não é exibido)
  forcar_avanco?: boolean
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

// Entrada do histórico do negócio (coleção "historico_negocios" no Skip Cloud)
export interface HistoricoNegocio {
  id: string
  deal: string
  owner?: string
  tipo: 'avanco' | 'avanco_forcado' | 'criacao' | 'perda' | 'ganho' | 'outro'
  titulo?: string
  descricao?: string
  etapa_de?: string
  etapa_para?: string
  justificativa?: string
  created: string
  updated: string
  expand?: {
    etapa_de?: EtapaFunil
    etapa_para?: EtapaFunil
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
