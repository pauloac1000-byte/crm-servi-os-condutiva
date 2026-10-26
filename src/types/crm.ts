export interface User {
  id: string
  name: string
  email: string
  avatar?: string
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

export interface Deal {
  id: string
  title: string
  value: number
  stage: string
  contact: string
  owner: string
  expected_close_date?: string
  priority: 'baixa' | 'média' | 'alta'
  notes?: string
  created: string
  updated: string
  expand?: {
    stage?: PipelineStage
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
