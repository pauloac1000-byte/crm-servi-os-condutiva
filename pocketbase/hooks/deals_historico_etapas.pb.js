// pb_hooks — histórico de etapas do negócio: registra quando cada deal entrou
// na etapa atual (data/hora + usuário responsável), sem digitação manual.
//
// Complementa deals_criterio_saida.pb.js (que valida o critério de saída e
// grava o evento de avanço em historico_negocios): este hook estampa em
// deals.etapa_desde / deals.etapa_desde_usuario a entrada em QUALQUER mudança
// de etapa, e também a entrada na primeira etapa quando o negócio é criado.
//
// Importante: toda a lógica fica INLINE nos callbacks — o JSVM do PocketBase
// executa callbacks em um pool separado e callbacks não enxergam declarações
// de topo de arquivo.

onRecordCreate((e) => {
  const record = e.record
  const etapaDepois = record.getString('etapa')
  if (etapaDepois) {
    const agora = new Date().toISOString().replace('T', ' ')
    record.set('etapa_desde', agora)
    record.set('etapa_desde_usuario', e.auth ? e.auth.id : '')
  }
  e.next()
}, 'deals')

onRecordUpdate((e) => {
  const record = e.record
  const original = record.original()

  const etapaDepois = record.getString('etapa')
  if (!etapaDepois) {
    e.next()
    return
  }

  let etapaAntes = ''
  try {
    etapaAntes = original.getString('etapa')
  } catch (_) {
    etapaAntes = ''
  }

  if (etapaAntes === etapaDepois) {
    e.next()
    return
  }

  // Mudou de etapa: estampa a entrada na nova etapa (data/hora + usuário)
  const agora = new Date().toISOString().replace('T', ' ')
  record.set('etapa_desde', agora)
  record.set('etapa_desde_usuario', e.auth ? e.auth.id : '')

  // Evento no histórico (coleção historico_negocios), silencioso em caso de
  // erro — a estampa na deals é o dado crítico e não deve ser bloqueada.
  try {
    const colecaoHistorico = e.app.findCollectionByNameOrId('historico_negocios')
    let nomeEtapa = etapaDepois
    try {
      nomeEtapa = e.app.findRecordById('etapas_funil', etapaDepois).getString('nome')
    } catch (_) {}
    const hist = new Record(colecaoHistorico)
    hist.set('deal', record.id)
    hist.set('owner', e.auth ? e.auth.id : original.getString('owner'))
    hist.set('tipo', 'entrada_etapa')
    hist.set('titulo', 'Entrada em etapa: ' + nomeEtapa)
    hist.set('descricao', 'Negócio entrou na etapa "' + nomeEtapa + '".')
    hist.set('etapa_para', etapaDepois)
    e.app.save(hist)
  } catch (err) {
    console.log('deals_historico_etapas: falha ao gravar histórico: ' + err)
  }

  e.next()
}, 'deals')
