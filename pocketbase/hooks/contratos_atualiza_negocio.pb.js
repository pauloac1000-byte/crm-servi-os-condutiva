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
// toda a lógica vive inline dentro de cada callback.
// ATENÇÃO: em hooks de registro não existe a global "app" — usar e.app.
// Regra do projeto: e.next() em TODOS os caminhos de sucesso.

onRecordCreate((e) => {
  const negocioId = e.record.getString('negocio')
  if (negocioId) {
    try {
      const deal = e.app.findRecordById('deals', negocioId)
      recalcular(e, deal)
    } catch (err) {
      console.log('contratos_atualiza_negocio: deal não encontrado: ' + err)
    }
  }
  e.next()
}, 'contratos')

onRecordUpdate((e) => {
  const negocioId = e.record.getString('negocio')
  // negocio removido na edição: zera o valor_total do negócio anterior
  const negocioAnterior = e.record.original().getString('negocio')
  try {
    if (negocioId) {
      const deal = e.app.findRecordById('deals', negocioId)
      recalcular(e, deal)
    }
    if (negocioAnterior && negocioAnterior !== negocioId) {
      const dealAnterior = e.app.findRecordById('deals', negocioAnterior)
      dealAnterior.set('valor_total', 0)
      e.app.save(dealAnterior)
    }
  } catch (err) {
    console.log('contratos_atualiza_negocio: falha ao sincronizar negócio: ' + err)
  }
  e.next()
}, 'contratos')

onRecordDelete((e) => {
  const negocioId = e.record.getString('negocio')
  if (negocioId) {
    try {
      const deal = e.app.findRecordById('deals', negocioId)
      deal.set('valor_total', 0)
      e.app.save(deal)
    } catch (err) {
      console.log('contratos_atualiza_negocio: falha ao zerar negócio: ' + err)
    }
  }
  e.next()
}, 'contratos')
