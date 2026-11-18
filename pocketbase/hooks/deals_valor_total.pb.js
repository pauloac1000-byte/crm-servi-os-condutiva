// pb_hooks — valor_total do negócio (coleção "deals").
//
// valor_total = valor_mensal × prazo_contrato_meses (o campo
// valor_implantacao foi removido do CRM — migration 0026).
//
// Regras:
//   - Calculado SEMPRE no servidor (create + update), coerente com o
//     custo_total das visitas — o cliente não define esse número.
//   - Quando valor_mensal/prazo não estão preenchidos, o valor_total não é
//     recalculado: negócios antigos continuam com o valor atual e nada quebra.
//   - valor_mensal é o valor real negociado (editável no negócio); o
//     valor_mensal_referencia do plano é apenas referência/sugestão.
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.

onRecordCreate((e) => {
  const record = e.record
  const mensal = record.getFloat('valor_mensal')
  const prazo = record.getFloat('prazo_contrato_meses')
  if (mensal > 0 && prazo > 0) {
    record.set('valor_total', mensal * prazo)
  }
  e.next()
}, 'deals')

onRecordUpdate((e) => {
  const record = e.record
  const mensal = record.getFloat('valor_mensal')
  const prazo = record.getFloat('prazo_contrato_meses')
  if (mensal > 0 && prazo > 0) {
    record.set('valor_total', mensal * prazo)
  }
  e.next()
}, 'deals')
