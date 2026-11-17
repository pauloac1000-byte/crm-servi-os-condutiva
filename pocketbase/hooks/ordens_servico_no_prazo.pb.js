// pb_hooks — campo "no_prazo" da ordem de serviço.
//
// Grava no SERVIDOR, a cada criação/edição, se a OS foi executada dentro do
// prazo acordado (data_encerramento <= prazo_acordado), para que o indicador
// da lista e a taxa de execução no prazo sejam confiáveis mesmo se o front
// não enviar o campo.
// Regras do projeto: em hooks de registro o banco é acessado via e.app
// (nunca "app" — ReferenceError 400) e TODO caminho termina com e.next() —
// sem e.next() o PocketBase pula a gravação e responde 200.
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.

onRecordCreate((e) => {
  const record = e.record
  if (record.getString('status') === 'concluída') {
    const prazo = (record.getString('prazo_acordado') || '').trim()
    const encerramento = (record.getString('data_encerramento') || '').trim()
    if (prazo && encerramento) {
      // datas PocketBase: "YYYY-MM-DD HH:mm:ss.SSSZ" — compara só a parte da data
      record.set('no_prazo', encerramento.slice(0, 10) <= prazo.slice(0, 10))
    }
  }
  e.next()
}, 'ordens_servico')

onRecordUpdate((e) => {
  const record = e.record
  if (record.getString('status') === 'concluída') {
    const prazo = (record.getString('prazo_acordado') || '').trim()
    const encerramento = (record.getString('data_encerramento') || '').trim()
    if (prazo && encerramento) {
      record.set('no_prazo', encerramento.slice(0, 10) <= prazo.slice(0, 10))
    }
  }
  e.next()
}, 'ordens_servico')
