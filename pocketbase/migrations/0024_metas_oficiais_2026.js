// Metas oficiais de 2026 da unidade de serviços: 4 metas ANUAIS
// (RCS 1.500.000, taxa_conversao_leads 25, os_no_prazo 80, NRR 110)
// e a meta de RCS distribuída igualmente pelos 12 meses (125000/mês),
// de modo que a soma dos meses bata exatamente com a anual (sem divergência).
// Idempotente: ignora células que já existam e não sobrescreve valores já editados.
// Gravação via SQL cru (padrão deste projeto — app.save em backfill não persiste no JSVM).
migrate(
  (app) => {
    const ano = 2026
    const anual = [
      { kpi: 'RCS', valor: 1500000 },
      { kpi: 'taxa_conversao_leads', valor: 25 },
      { kpi: 'os_no_prazo', valor: 80 },
      { kpi: 'NRR', valor: 110 },
    ]
    const valorMesRcs = 125000

    // metas anuais (mes = 0 = anual; campo number do PB não aceita vazio)
    anual.forEach(({ kpi, valor }) => {
      app
        .db()
        .newQuery(
          'INSERT INTO metas (id, ano, mes, kpi, valor_meta, created, updated) ' +
            "VALUES ({:id}, {:ano}, 0, {:kpi}, {:valor}, datetime('now'), datetime('now')) " +
            'ON CONFLICT (ano, mes, kpi) DO NOTHING',
        )
        .bind({ id: $security.randomString(15), ano, kpi, valor })
        .execute()
    })

    // 12 meses de RCS (125000 cada)
    for (let mes = 1; mes <= 12; mes++) {
      app
        .db()
        .newQuery(
          'INSERT INTO metas (id, ano, mes, kpi, valor_meta, created, updated) ' +
            "VALUES ({:id}, {:ano}, {:mes}, 'RCS', {:valor}, datetime('now'), datetime('now')) " +
            'ON CONFLICT (ano, mes, kpi) DO NOTHING',
        )
        .bind({ id: $security.randomString(15), ano, mes, valor: valorMesRcs })
        .execute()
    }
  },
  (app) => {
    // revert: remove apenas as metas oficiais de 2026 (anuais + mensais de RCS)
    app.db().newQuery("DELETE FROM metas WHERE ano = 2026 AND (mes = 0 OR kpi = 'RCS')").execute()
  },
)
