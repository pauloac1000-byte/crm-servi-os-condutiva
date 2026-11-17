// pb_hooks — valor_total do negócio (coleção "deals").
//
// Registra qual plano de serviço o cliente escolheu e calcula o valor da
// oportunidade: valor_total = valor_implantacao + valor_mensal × prazo_contrato_meses.
//
// Regras:
//   - Calculado SEMPRE no servidor (create + update), coerente com o
//     custo_total das visitas — o cliente não define esse número.
//   - Quando valor_implantacao/valor_mensal/prazo não estão preenchidos, o
//     valor_total não é recalculado: negócios antigos continuam com o valor
//     atual (deals.value) e nada quebra.
//   - valor_mensal é o valor real negociado (editável no negócio); o
//     valor_mensal_referencia do plano é apenas referência/sugestão.
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.

onRecordCreate((e) => {
  const record = e.record
  const implantacao = record.getFloat('valor_implantacao')
  const mensal = record.getFloat('valor_mensal')
  const prazo = record.getFloat('prazo_contrato_meses')
  if (implantacao > 0 || (mensal > 0 && prazo > 0)) {
    record.set('valor_total', implantacao + mensal * prazo)
  }
  e.next()
}, 'deals')

onRecordUpdate((e) => {
  const record = e.record
  const implantacao = record.getFloat('valor_implantacao')
  const mensal = record.getFloat('valor_mensal')
  const prazo = record.getFloat('prazo_contrato_meses')
  if (implantacao > 0 || (mensal > 0 && prazo > 0)) {
    record.set('valor_total', implantacao + mensal * prazo)
  }
  e.next()
}, 'deals')
