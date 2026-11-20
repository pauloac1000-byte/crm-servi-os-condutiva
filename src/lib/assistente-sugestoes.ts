// Sugestões de pergunta do assistente quando o painel abre vazio — variam pela
// página aberta do CRM. São SEMPRE perguntas de contagem/soma/situação, que o
// assistente responde com o resumo agregado do servidor; NUNCA sugestões que
// peçam dado pessoal (responsável, nome, telefone, e-mail, endereço).
export function sugestoesAssistente(caminho: string): string[] {
  const base: Record<string, string[]> = {
    '/': [
      'Quantos leads existem no funil agora?',
      'Qual o total de contratos ativos?',
      'Como está a meta deste mês?',
    ],
    '/pipeline': [
      'Quantos leads existem em cada etapa do funil?',
      'Quantos leads foram ganhos e quantos perdidos?',
      'Qual etapa tem mais leads parados?',
    ],
    '/deals': [
      'Quantos leads existem por status?',
      'Quantos leads estão em cada etapa do funil?',
      'Quantos contatos já foram cadastrados?',
    ],
    '/contacts': [
      'Quantos contatos existem por status?',
      'Quantos contatos há no total?',
      'Quantas atividades estão pendentes?',
    ],
    '/activities': [
      'Quantas atividades estão pendentes e quantas concluídas?',
      'Quantas atividades existem no total?',
      'Quantos leads estão no funil agora?',
    ],
    '/visitas': [
      'Quantas visitas foram feitas por resultado?',
      'Qual o custo total das visitas?',
      'Quantas visitas há no total?',
    ],
    '/contratos': [
      'Quantos contratos existem por situação?',
      'Qual a soma dos valores mensais dos contratos ativos?',
      'Quantos contratos há no total?',
    ],
    '/ordens-servico': [
      'Quantas ordens de serviço existem por status?',
      'Quantas ordens de serviço há no total?',
      'Quantos contratos ativos existem?',
    ],
    '/metas': [
      'Batemos a meta deste mês?',
      'Qual o realizado acumulado do ano contra a meta anual?',
      'Qual mês teve maior realizado?',
    ],
    '/glossario': [
      'Quantos leads existem no funil agora?',
      'Qual o total de contratos ativos?',
      'Como está a meta deste mês?',
    ],
  }
  return base[caminho] || base['/']
}
