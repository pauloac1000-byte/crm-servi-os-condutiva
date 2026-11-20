import pb from '@/lib/pocketbase/client'

/**
 * Serviço do assistente de IA (painel src/components/Assistente/PainelAssistente.tsx).
 * A rota /backend/v1/assistente-ia (hook assistente_ia.pb.js) responde com
 * { resposta, conversa_id, consultas }: "consultas" traz as funções de leitura
 * acionadas pelo modelo (nome + filtro + nº de linhas), que o painel mostra numa
 * linha discreta. Nenhum dado pessoal trafega: a rota só devolve ids e números,
 * e a troca de "#id" pelo nome acontece SÓ aqui, no cliente (assistente-resolver-nomes).
 */

export interface ConsultaFuncao {
  funcao: string
  filtro: string
  linhas: number
}

export interface RespostaAssistente {
  resposta: string
  conversaId: string
  consultas: ConsultaFuncao[]
}

export interface TrocaAssistente {
  id: string
  pergunta: string
  resposta: string
  created: string
}

export interface ConversaResumo {
  id: string
  conversaId: string
  pergunta: string
  created: string
}

export async function perguntarAssistente(
  pergunta: string,
  conversaId: string,
): Promise<RespostaAssistente> {
  const resposta = await pb.send<{
    resposta?: string
    conversa_id?: string
    consultas?: ConsultaFuncao[]
  }>('/backend/v1/assistente-ia', {
    method: 'POST',
    body: { pergunta, conversa_id: conversaId },
  })

  return {
    resposta: resposta.resposta ?? '',
    conversaId: resposta.conversa_id ?? conversaId,
    consultas: Array.isArray(resposta.consultas) ? resposta.consultas : [],
  }
}

// Última conversa do usuário (a mais recente por data); `limite` reservado.
export async function carregarConversas(_limite = 1): Promise<ConversaResumo[]> {
  const lista = await pb.collection('assistente_conversas').getList(1, 50, {
    sort: '-created',
    fields: 'id,conversa_id,pergunta,created',
  })
  const vistos = new Set<string>()
  const resumos: ConversaResumo[] = []
  for (const item of lista.items as unknown as Record<string, string>[]) {
    if (vistos.has(item.conversa_id)) continue
    vistos.add(item.conversa_id)
    resumos.push({
      id: item.id,
      conversaId: item.conversa_id,
      pergunta: item.pergunta,
      created: item.created,
    })
  }
  return resumos
}

export async function carregarTrocas(conversaId: string): Promise<TrocaAssistente[]> {
  const lista = await pb.collection('assistente_conversas').getList(1, 500, {
    filter: `conversa_id="${conversaId}"`,
    sort: 'created',
    fields: 'id,pergunta,resposta,created',
  })
  return lista.items as unknown as TrocaAssistente[]
}

export async function excluirTroca(id: string): Promise<void> {
  await pb.collection('assistente_conversas').delete(id)
}
