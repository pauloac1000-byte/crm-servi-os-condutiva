import pb from '@/lib/pocketbase/client'
import type { ListResult } from 'pocketbase'

export type StatusSolicitacao = 'pendente' | 'aprovado' | 'negado'

export type SolicitacaoAcesso = {
  id: string
  nome: string
  email: string
  telefone: string
  vinculo: string
  status: StatusSolicitacao
  avaliado_por: string
  avaliado_em: string
  created: string
  updated: string
}

export type SolicitacaoSuporte = {
  id: string
  nome: string
  contato: string
  descricao: string
  created: string
}

export async function criarSolicitacaoAcesso(dados: {
  nome: string
  email: string
  telefone: string
  vinculo: string
}) {
  return pb.collection('solicitacoes_acesso').create({
    nome: dados.nome,
    email: dados.email,
    telefone: dados.telefone,
    vinculo: dados.vinculo,
    status: 'pendente',
  })
}

export async function criarSolicitacaoSuporte(dados: {
  nome: string
  contato: string
  descricao: string
}) {
  return pb.collection('solicitacoes_suporte').create(dados)
}

export async function listarSolicitacoesAcesso(): Promise<SolicitacaoAcesso[]> {
  const resposta: ListResult<SolicitacaoAcesso> = await pb
    .collection('solicitacoes_acesso')
    .getList(1, 200, { sort: '-created' })

  return resposta.items
}

export async function avaliarSolicitacaoAcesso(
  id: string,
  status: StatusSolicitacao,
  avaliadoPor: string,
) {
  return pb.collection('solicitacoes_acesso').update(id, {
    status,
    avaliado_por: avaliadoPor,
    avaliado_em: new Date().toISOString(),
  })
}
