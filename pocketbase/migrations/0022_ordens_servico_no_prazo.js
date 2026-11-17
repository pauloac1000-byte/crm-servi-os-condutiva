// Adiciona o campo bool "no_prazo" à coleção "ordens_servico" e preenche
// (backfill SQL cru, idempotente) as OS já concluídas:
//   no_prazo = data_encerramento <= prazo_acordado
// Registros sem prazo_acordado ou sem data_encerramento ficam NULL (—).
// Reexecutar é seguro: o UPDATE só atinge concluídas com os dois campos
// preenchidos, recalculando sempre o mesmo valor.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ordens_servico')
    if (!col.fields.getByName('no_prazo')) {
      col.fields.add(new BoolField({ name: 'no_prazo' }))
      app.save(col)
    }

    // Backfill via SQL cru — record.set + app.save pode não persistir no JSVM.
    // Comparação lexicográfica: datas PocketBase são "YYYY-MM-DD HH:mm:ss.SSSZ".
    app
      .db()
      .newQuery(`
    UPDATE ordens_servico
    SET no_prazo = 1
    WHERE status = 'concluída'
      AND prazo_acordado != ''
      AND data_encerramento != ''
      AND substr(data_encerramento, 1, 10) <= substr(prazo_acordado, 1, 10)
  `)
      .execute()
    app
      .db()
      .newQuery(`
    UPDATE ordens_servico
    SET no_prazo = 0
    WHERE status = 'concluída'
      AND prazo_acordado != ''
      AND data_encerramento != ''
      AND substr(data_encerramento, 1, 10) > substr(prazo_acordado, 1, 10)
  `)
      .execute()

    // OS concluída sem prazo ou sem encerramento: sem julgamento de prazo.
    app
      .db()
      .newQuery(`
    UPDATE ordens_servico
    SET no_prazo = NULL
    WHERE status = 'concluída'
      AND (prazo_acordado = '' OR prazo_acordado IS NULL
           OR data_encerramento = '' OR data_encerramento IS NULL)
  `)
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ordens_servico')
    if (col.fields.getByName('no_prazo')) {
      col.fields.removeByName('no_prazo')
      app.save(col)
    }
  },
)
