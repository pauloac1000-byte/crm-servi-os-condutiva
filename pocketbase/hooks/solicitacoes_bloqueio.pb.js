/// <reference path="../pb_data/types.d.ts" />
// pb_hooks — barreira de acesso pelo fluxo de aprovação.
//
// Se o e-mail que está autenticando tem um pedido em solicitacoes_acesso com
// status "pendente", o login é BLOQUEADO (aguardando avaliação do admin);
// com status "negado", também é bloqueado (acesso não liberado, falar com o
// suporte). Usuário sem pedido de acesso NUNCA é afetado — inclusive os que
// já usam o CRM.
//
// Regras do projeto: em hooks de registro o banco é acessado via e.app (nunca
// a global "app") e TODO caminho de sucesso termina com e.next() — bloqueio
// termina em throw, nunca em return silencioso (sem e.next() o PocketBase
// PULA a gravação e responde 200; aqui o throw devolve o erro correto).

onRecordAuthRequest((e) => {
  var email = String(e.record.email() || '')
    .trim()
    .toLowerCase()
  if (!email) {
    e.next()
    return
  }

  var status = ''
  try {
    var pedidos = e.app.findRecordsByFilter(
      'solicitacoes_acesso',
      "email = '" + email + "'",
      '-created',
      1,
      0,
    )
    if (pedidos.length > 0) {
      status = pedidos[0].getString('status')
    }
  } catch (erroBusca) {
    // coleção indisponível/sem pedido: não bloqueia (falha aberta) — só loga
    console.log(
      'solicitacoes_bloqueio: falha ao consultar pedido de acesso: ' +
        String((erroBusca && erroBusca.message) || erroBusca || ''),
    )
    status = ''
  }

  if (status === 'pendente') {
    throw new ForbiddenError(
      'Seu acesso está aguardando avaliação do administrador da Condutiva (liberação em até 24 horas).',
    )
  }
  if (status === 'negado') {
    throw new ForbiddenError(
      'Seu acesso não foi liberado. Fale com o suporte para mais informações.',
    )
  }

  e.next()
}, 'users')
