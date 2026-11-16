// pb_hooks — custo_total da visita comercial.
//
// Preenche "custo_total" com a soma dos valores monetários da visita
// (valor_combustivel + pedagio + alimentacao + hospedagem + outros_custos).
// km_rodados e horas_dedicadas NÃO entram na soma — são quantidades, não
// valores monetários. Roda no servidor em toda criação e edição, garantindo
// que o valor gravado é sempre a soma correta, mesmo que o cliente envie
// outro número.

onRecordCreate((e) => {
  const record = e.record
  const soma =
    record.getFloat('valor_combustivel') +
    record.getFloat('pedagio') +
    record.getFloat('alimentacao') +
    record.getFloat('hospedagem') +
    record.getFloat('outros_custos')
  record.set('custo_total', soma)
  e.next()
}, 'visitas_comerciais')

onRecordUpdate((e) => {
  const record = e.record
  const soma =
    record.getFloat('valor_combustivel') +
    record.getFloat('pedagio') +
    record.getFloat('alimentacao') +
    record.getFloat('hospedagem') +
    record.getFloat('outros_custos')
  record.set('custo_total', soma)
  e.next()
}, 'visitas_comerciais')
