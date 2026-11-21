/// <reference path="../pb_data/types.d.ts" />
// pb_hooks — aviso ao administrador por e-mail.
//
// 1) solicitacoes_acesso: a cada novo pedido de acesso (status inicial
//    "pendente"), envia e-mail para paulo@condutiva.com.br com nome, e-mail,
//    telefone, vínculo e data/hora do pedido.
// 2) solicitacoes_suporte: a cada nova mensagem do canal de suporte, envia
//    e-mail para paulo@condutiva.com.br com a identificação do solicitante,
//    o contato informado e o texto escrito.
//
// Regras do projeto: em hooks de registro o banco é acessado via e.app (nunca
// a global "app") e TODO caminho de sucesso termina com e.next() — bloqueio
// termina em throw, nunca em return silencioso. A falha de envio do e-mail é
// apenas LOGADA: não derruba a gravação do pedido/mensagem (a lista do admin
// e a resposta ao usuário continuam válidas sem o e-mail).
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.

// ---- pedido de acesso ----
onRecordAfterCreateSuccess((e) => {
  var emailAdmin = 'paulo@condutiva.com.br'

  var d = new Date(e.record.getDateTime('created').string())
  if (isNaN(d.getTime())) {
    d = new Date()
  }
  var pad = function (n) {
    return n < 10 ? '0' + n : String(n)
  }
  var dataPedido =
    pad(d.getDate()) +
    '/' +
    pad(d.getMonth() + 1) +
    '/' +
    d.getFullYear() +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())

  var esc = function (texto) {
    return String(texto === undefined || texto === null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  var vinculo = e.record.getString('vinculo')
  var vinculoTexto = vinculo === 'parceiro' ? 'Parceiro autorizado' : 'Colaborador'

  var linhas = [
    '<p style="margin:0 0 12px 0;"><strong>Novo pedido de acesso no CRM Condutiva.</strong></p>',
    '<p style="margin:0 0 8px 0;">Nome: ' + esc(e.record.getString('nome')) + '</p>',
    '<p style="margin:0 0 8px 0;">E-mail: ' + esc(e.record.getString('email')) + '</p>',
    '<p style="margin:0 0 8px 0;">Telefone: ' + esc(e.record.getString('telefone')) + '</p>',
    '<p style="margin:0 0 8px 0;">Vínculo: ' + vinculoTexto + '</p>',
    '<p style="margin:0 0 8px 0;">Data do pedido: ' + dataPedido + '</p>',
    '<p style="margin:12px 0 0 0;">O pedido está com status <strong>Pendente</strong> e aguarda avaliação no painel Usuários.</p>',
  ]
  var corpo = ''
  for (var i = 0; i < linhas.length; i++) {
    corpo = corpo + linhas[i]
  }

  try {
    var mensagem = new MailerMessage({
      from: {
        address: e.app.settings().meta.senderAddress,
        name: e.app.settings().meta.senderName,
      },
      to: [{ address: emailAdmin }],
      subject: 'Novo pedido de acesso aguardando avaliação',
      html:
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;">' +
        corpo +
        '</div>',
    })
    e.app.newMailClient().send(mensagem)
  } catch (erroMail) {
    console.log(
      'solicitacoes_aviso: falha ao enviar e-mail para ' +
        emailAdmin +
        ': ' +
        String((erroMail && erroMail.message) || erroMail || ''),
    )
  }

  // Único caminho de sucesso: e.next() (a gravação já aconteceu).
  e.next()
}, 'solicitacoes_acesso')

// ---- mensagem de suporte ----
onRecordAfterCreateSuccess((e) => {
  var emailAdmin = 'paulo@condutiva.com.br'

  var d = new Date(e.record.getDateTime('created').string())
  if (isNaN(d.getTime())) {
    d = new Date()
  }
  var pad = function (n) {
    return n < 10 ? '0' + n : String(n)
  }
  var dataPedido =
    pad(d.getDate()) +
    '/' +
    pad(d.getMonth() + 1) +
    '/' +
    d.getFullYear() +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())

  var esc = function (texto) {
    return String(texto === undefined || texto === null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  var linhas = [
    '<p style="margin:0 0 12px 0;"><strong>Nova solicitação de suporte no CRM Condutiva.</strong></p>',
    '<p style="margin:0 0 8px 0;">Solicitante: ' + esc(e.record.getString('nome')) + '</p>',
    '<p style="margin:0 0 8px 0;">Contato: ' + esc(e.record.getString('contato')) + '</p>',
    '<p style="margin:0 0 8px 0;">Descrição: ' + esc(e.record.getString('descricao')) + '</p>',
    '<p style="margin:12px 0 0 0;">Data: ' + dataPedido + '</p>',
  ]
  var corpo = ''
  for (var i = 0; i < linhas.length; i++) {
    corpo = corpo + linhas[i]
  }

  try {
    var mensagem = new MailerMessage({
      from: {
        address: e.app.settings().meta.senderAddress,
        name: e.app.settings().meta.senderName,
      },
      to: [{ address: emailAdmin }],
      subject: 'Nova solicitação de suporte — CRM Condutiva',
      html:
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;">' +
        corpo +
        '</div>',
    })
    e.app.newMailClient().send(mensagem)
  } catch (erroMail) {
    console.log(
      'solicitacoes_aviso: falha ao enviar e-mail para ' +
        emailAdmin +
        ': ' +
        String((erroMail && erroMail.message) || erroMail || ''),
    )
  }

  // Único caminho de sucesso: e.next().
  e.next()
}, 'solicitacoes_suporte')
