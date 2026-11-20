import pb from '@/lib/pocketbase/client'

// Assistente de IA do CRM.
// - perguntarAssistente: chamada à rota de servidor POST /backend/v1/assistente-ia
//   (a chave da IA fica no backend). Envia a pergunta e o identificador da conversa —
//   nenhum dado do CRM nesta etapa; a resposta vem com o conversa_id (novo quando
//   o servidor gerou um) e a troca fica persistida na coleção assistente_conversas.
// - carregarConversas / carregarTrocas / excluirConversa: leitura da coleção
//   assistente_conversas (regras de API: cada usuário vê apenas as suas trocas).

const MSG_PADRAO = 'Não foi possível obter resposta do assistente. Tente novamente.'

export interface TrocaAssistente {
  id: string
  pergunta: string
  resposta: string
  conversaId: string
  data: string
}

export interface RespostaAssistente {
  resposta: string
  conversaId: string
}

export async function perguntarAssistente(
  pergunta: string,
  conversaId?: string,
): Promise<RespostaAssistente> {
  try {
    const data = await pb.send('/backend/v1/assistente-ia', {
      method: 'POST',
      body: { pergunta, conversa_id: conversaId || '' },
    })
    const texto = typeof data?.resposta === 'string' ? data.resposta : ''
    if (!texto) throw new Error(MSG_PADRAO)
    const idVolta = typeof data?.conversa_id === 'string' ? data.conversa_id : ''
    return { resposta: texto, conversaId: idVolta }
  } catch (err) {
    // o servidor devolve mensagens curtas em português em "erro"; qualquer outra falha vira a padrão
    const msgServidor = (err as { response?: { erro?: unknown } })?.response?.erro
    throw new Error(typeof msgServidor === 'string' && msgServidor ? msgServidor : MSG_PADRAO)
  }
}

// Últimas trocas do usuário, da mais antiga para a mais recente. O painel usa a
// primeira (mais recente) para saber qual conversa está em aberto.
export interface RegistroConversa {
  id: string
  pergunta: string
  resposta: string
  conversa_id: string
  created: string
}

function paraTroca(item: RegistroConversa): TrocaAssistente {
  return {
    id: item.id,
    pergunta: String(item.pergunta || ''),
    resposta: String(item.resposta || ''),
    conversaId: String(item.conversa_id || ''),
    data: String(item.created || ''),
  }
}

export async function carregarConversas(limite = 20): Promise<TrocaAssistente[]> {
  const itens = await pb
    .collection('assistente_conversas')
    .getFullList<RegistroConversa>({ sort: '-created' })
  return itens.slice(0, limite).map(paraTroca)
}

// Todas as trocas de UMA conversa do usuário, em ordem cronológica.
export async function carregarTrocas(conversaId: string): Promise<TrocaAssistente[]> {
  const itens = await pb.collection('assistente_conversas').getFullList<RegistroConversa>({
    filter: `conversa_id = "${conversaId}"`,
    sort: 'created',
  })
  return itens.map(paraTroca)
}

// Apaga UMA troca (a regra de API limita ao próprio usuário). Uso do botão
// "limpar" do painel: apaga as trocas da conversa atual, uma a uma.
export async function excluirTroca(id: string): Promise<void> {
  await pb.collection('assistente_conversas').delete(id)
}
