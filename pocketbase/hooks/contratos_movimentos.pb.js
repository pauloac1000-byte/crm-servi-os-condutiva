// pb_hooks — movimentos de receita recorrente (coleção "movimentos_receita").
//
// Gera AUTOMATICAMENTE um movimento de receita em 3 situações:
//   1. Criação do contrato → movimento com o tipo do contrato (padrão "novo"),
//      competência = mês da data_inicio (mês corrente quando data_inicio vazia)
//      e valor = valor_mensal do contrato.
//   2. Edição que altera o valor_mensal (contrato ainda não encerrado) →
//      "expansão" quando o valor sobe, "contração" quando desce, competência =
//      mês corrente, valor = novo valor mensal.
//   3. Edição que muda o status para "encerrado" → "churn" com o valor mensal
//      vigente, competência = mês da data_fim (mês corrente quando vazia).
//      Encerramento e mudança de valor no MESMO save geram apenas o churn —
//      nunca dois movimentos no mesmo evento.
//
// O sinal/semântica de expansão/contração/churn NÃO é invertido aqui: grava-se
// o valor mensal correspondente ao movimento, como o usuário lançar. Movimentos
// manuais são criados direto pela tela de Contratos (sem este hook).
//
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.
//
// IMPORTANTE (bug 0.0.22/0.0.23): e.next() é chamado em TODOS os caminhos de
// sucesso — sem ele o PocketBase pula o write e responde 200. Falha ao gravar
// o movimento é logada e NÃO impede o write do contrato (o dado crítico).

onRecordCreate((e) => {
  const record = e.record

  const competenciaDe = function (dataStr, fallbackAgora) {
    // dataStr chega como "2026-11-01 00:00:00.000Z" (ou vazio)
    const dia = (dataStr || '').split(' ')[0].split('T')[0]
    if (dia && dia.length >= 7) return dia.slice(0, 7)
    return fallbackAgora
  }
  const competenciaAtual = function () {
    const agora = new Date()
    const m = agora.getMonth() + 1
    return agora.getFullYear() + '-' + (m < 10 ? '0' + m : '' + m)
  }

  const valor = record.getFloat('valor_mensal')
  const comp = competenciaDe(record.getString('data_inicio'), competenciaAtual())
  let tipo = record.getString('tipo')
  if (!tipo) tipo = 'novo'

  try {
    const colecao = app.findCollectionByNameOrId('movimentos_receita')
    const mov = new Record(colecao)
    mov.set('contrato', record.id)
    mov.set('competencia', comp)
    mov.set('tipo', tipo)
    mov.set('valor_mensal', valor)
    // Automático: responsável = dono do contrato (ou quem criou, como fallback)
    mov.set('responsavel', record.getString('responsavel') || (e.auth ? e.auth.id : ''))
    app.save(mov)
  } catch (err) {
    console.log('contratos_movimentos: falha ao gravar movimento de criação: ' + err)
  }

  e.next()
}, 'contratos')

onRecordUpdate((e) => {
  const record = e.record
  const original = record.original()

  const competenciaAtual = function () {
    const agora = new Date()
    const m = agora.getMonth() + 1
    return agora.getFullYear() + '-' + (m < 10 ? '0' + m : '' + m)
  }
  const competenciaDe = function (dataStr, fallbackAgora) {
    const dia = (dataStr || '').split(' ')[0].split('T')[0]
    if (dia && dia.length >= 7) return dia.slice(0, 7)
    return fallbackAgora
  }
  const gravarMovimento = function (comp, tipo, valorMensal) {
    const colecao = app.findCollectionByNameOrId('movimentos_receita')
    const mov = new Record(colecao)
    mov.set('contrato', record.id)
    mov.set('competencia', comp)
    mov.set('tipo', tipo)
    mov.set('valor_mensal', valorMensal)
    // Automático: responsável = dono do contrato (ou quem editou, como fallback)
    mov.set('responsavel', record.getString('responsavel') || (e.auth ? e.auth.id : ''))
    app.save(mov)
  }

  const statusDepois = record.getString('status')
  const statusAntes = original.getString('status')

  // Encerramento: movimento de churn com o valor mensal vigente, na competência
  // da data_fim (mês corrente quando vazia). Exclusivo — não gera também
  // movimento de expansão/contração no mesmo save.
  if (statusDepois === 'encerrado' && statusAntes !== 'encerrado') {
    try {
      gravarMovimento(
        competenciaDe(record.getString('data_fim'), competenciaAtual()),
        'churn',
        record.getFloat('valor_mensal'),
      )
    } catch (err) {
      console.log('contratos_movimentos: falha ao gravar movimento de churn: ' + err)
    }
    e.next()
    return
  }

  // Mudança de valor mensal (contrato ainda não encerrado): expansão ou contração
  const valorDepois = record.getFloat('valor_mensal')
  const valorAntes = original.getFloat('valor_mensal')
  if (valorDepois !== valorAntes && statusDepois !== 'encerrado') {
    try {
      gravarMovimento(
        competenciaAtual(),
        valorDepois > valorAntes ? 'expansão' : 'contração',
        valorDepois,
      )
    } catch (err) {
      console.log('contratos_movimentos: falha ao gravar movimento de valor: ' + err)
    }
  }

  e.next()
}, 'contratos')
