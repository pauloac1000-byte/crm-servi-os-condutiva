// pb_hooks — custo_total da visita comercial.
//
// Preenche "custo_total" com a soma dos valores da visita:
//   valor_combustivel + pedagio + alimentacao + hospedagem + outros_custos
//   + (horas_dedicadas × custo da hora comercial, lido da coleção
//     "configuracoes" — padrão R$ 90,00 caso o parâmetro não exista).
// km_rodados NÃO entra na soma — é quantidade, não valor monetário (o custo do
// deslocamento entra pelo valor_combustivel, pré-preenchido no form pelo
// custo_km das configurações).
// Roda no servidor em toda criação e edição, garantindo que o valor gravado é
// sempre a soma correta, mesmo que o cliente envie outro número.
// ATENÇÃO (JSVM): callbacks não enxergam declarações de topo de arquivo —
// toda a lógica vive inline dentro de cada callback.

onRecordCreate((e) => {
  let custoHora = 90.0
  try {
    const config = e.app.findFirstRecordByFilter('configuracoes', 'id != ""', '', 1, 0)
    if (config) {
      const v = config.getFloat('custo_hora_comercial')
      if (v > 0) custoHora = v
    }
  } catch (_) {
    // sem registro de configurações: usa o padrão
  }
  const record = e.record
  const custoHoras = record.getFloat('horas_dedicadas') * custoHora
  const soma =
    record.getFloat('valor_combustivel') +
    record.getFloat('pedagio') +
    record.getFloat('alimentacao') +
    record.getFloat('hospedagem') +
    record.getFloat('outros_custos') +
    custoHoras
  record.set('custo_total', soma)
  e.next()
}, 'visitas_comerciais')

onRecordUpdate((e) => {
  let custoHora = 90.0
  try {
    const config = e.app.findFirstRecordByFilter('configuracoes', 'id != ""', '', 1, 0)
    if (config) {
      const v = config.getFloat('custo_hora_comercial')
      if (v > 0) custoHora = v
    }
  } catch (_) {
    // sem registro de configurações: usa o padrão
  }
  const record = e.record
  const custoHoras = record.getFloat('horas_dedicadas') * custoHora
  const soma =
    record.getFloat('valor_combustivel') +
    record.getFloat('pedagio') +
    record.getFloat('alimentacao') +
    record.getFloat('hospedagem') +
    record.getFloat('outros_custos') +
    custoHoras
  record.set('custo_total', soma)
  e.next()
}, 'visitas_comerciais')
