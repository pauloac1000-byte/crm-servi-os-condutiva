// pb_hooks — mantém deals.valor_total em sincronia com o CONTRATO vinculado.
//
// valor_total do negócio = valor_mensal × prazo (meses) do contrato mais
// recente vinculado (contratos.negocio). Como o formulário de lead não tem
// mais campos de contrato, o cálculo precisa reagir a escrever/alterar o
// CONTRATO (não só ao negócio, como faz deals_valor_total.pb.js).
//
// Prazo = data_fim − data_inicio (30,44 dias/mês, arredondada), o mesmo
// critério do motor de KPIs (src/services/kpis.ts); sem data_fim, 12 meses.
// Sem contrato ou valor: 0.
//
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica de recálculo vive INLINE dentro de cada callback.
// ATENÇÃO: em hooks de registro não existe a global "app" — usar e.app.
// Regra do projeto: e.next() em TODOS os caminhos de sucesso; bloqueio com throw.

onRecordCreate((e) => {
  const negocioId = e.record.getString('negocio')
  if (negocioId) {
    try {
      // recálculo INLINE: contrato mais recente vinculado ao negócio
      const deal = e.app.findRecordById('deals', negocioId)
      let valorTotal = 0
      const contratos = e.app.findRecordsByFilter(
        'contratos',
        'negocio = {:id}',
        '-created',
        1,
        0,
        { id: negocioId },
      )
      if (contratos.length > 0) {
        const c = contratos[0]
        const mensal = c.getFloat('valor_mensal')
        const ini = (c.getString('data_inicio') || '').split(' ')[0].split('T')[0]
        const fim = (c.getString('data_fim') || '').split(' ')[0].split('T')[0]
        let prazo = 12
        if (ini && fim) {
          const dias =
            (new Date(fim).getTime() - new Date(ini).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          prazo = Math.round(dias)
        }
        if (mensal > 0 && prazo > 0) valorTotal = mensal * prazo
      }
      deal.set('valor_total', valorTotal)
      e.app.save(deal)
    } catch (err) {
      console.log('contratos_atualiza_negocio: falha ao sincronizar negócio: ' + err)
    }
  }
  e.next()
}, 'contratos')

onRecordUpdate((e) => {
  const negocioId = e.record.getString('negocio')
  // negocio removido/trocado na edição: recalcula o negócio anterior também
  const negocioAnterior = e.record.original().getString('negocio')
  const alvos = []
  if (negocioId) alvos.push(negocioId)
  if (negocioAnterior && negocioAnterior !== negocioId) alvos.push(negocioAnterior)
  for (let i = 0; i < alvos.length; i++) {
    try {
      // recálculo INLINE: contrato mais recente vinculado ao negócio
      const deal = e.app.findRecordById('deals', alvos[i])
      let valorTotal = 0
      const contratos = e.app.findRecordsByFilter(
        'contratos',
        'negocio = {:id}',
        '-created',
        1,
        0,
        { id: alvos[i] },
      )
      if (contratos.length > 0) {
        const c = contratos[0]
        const mensal = c.getFloat('valor_mensal')
        const ini = (c.getString('data_inicio') || '').split(' ')[0].split('T')[0]
        const fim = (c.getString('data_fim') || '').split(' ')[0].split('T')[0]
        let prazo = 12
        if (ini && fim) {
          const dias =
            (new Date(fim).getTime() - new Date(ini).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          prazo = Math.round(dias)
        }
        if (mensal > 0 && prazo > 0) valorTotal = mensal * prazo
      }
      deal.set('valor_total', valorTotal)
      e.app.save(deal)
    } catch (err) {
      console.log('contratos_atualiza_negocio: falha ao sincronizar negócio: ' + err)
    }
  }
  e.next()
}, 'contratos')

onRecordDelete((e) => {
  const negocioId = e.record.getString('negocio')
  if (negocioId) {
    try {
      // recálculo INLINE: sem o contrato deletado, o negócio volta a procurar
      // outro contrato vinculado (0 se não houver nenhum)
      const deal = e.app.findRecordById('deals', negocioId)
      let valorTotal = 0
      const contratos = e.app.findRecordsByFilter(
        'contratos',
        'negocio = {:id}',
        '-created',
        1,
        0,
        { id: negocioId },
      )
      if (contratos.length > 0) {
        const c = contratos[0]
        const mensal = c.getFloat('valor_mensal')
        const ini = (c.getString('data_inicio') || '').split(' ')[0].split('T')[0]
        const fim = (c.getString('data_fim') || '').split(' ')[0].split('T')[0]
        let prazo = 12
        if (ini && fim) {
          const dias =
            (new Date(fim).getTime() - new Date(ini).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          prazo = Math.round(dias)
        }
        if (mensal > 0 && prazo > 0) valorTotal = mensal * prazo
      }
      deal.set('valor_total', valorTotal)
      e.app.save(deal)
    } catch (err) {
      console.log('contratos_atualiza_negocio: falha ao zerar negócio: ' + err)
    }
  }
  e.next()
}, 'contratos')
