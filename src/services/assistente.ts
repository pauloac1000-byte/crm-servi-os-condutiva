import pb from '@/lib/pocketbase/client'

// Chamada à rota de servidor POST /backend/v1/assistente-ia (a chave da IA fica no backend).
// Envia somente a pergunta digitada — nenhum dado do CRM nesta etapa.
const MSG_PADRAO = 'Não foi possível obter resposta do assistente. Tente novamente.'

export async function perguntarAssistente(pergunta: string): Promise<string> {
  try {
    const data = await pb.send('/backend/v1/assistente-ia', {
      method: 'POST',
      body: { pergunta },
    })
    const texto = typeof data?.resposta === 'string' ? data.resposta : ''
    if (!texto) throw new Error(MSG_PADRAO)
    return texto
  } catch (err) {
    // o servidor devolve mensagens curtas em português em "erro"; qualquer outra falha vira a padrão
    const msgServidor = (err as { response?: { erro?: unknown } })?.response?.erro
    throw new Error(typeof msgServidor === 'string' && msgServidor ? msgServidor : MSG_PADRAO)
  }
}
