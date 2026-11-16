migrate(
  (app) => {
    // ------------------------------------------------------------------
    // Correção do backfill da 0008: os deals existentes continuam com
    // etapa_desde vazio (o loop com record.set/app.save da 0008 não
    // efetivou o valor do campo date no JSVM), então o indicador
    // "Nesta etapa há X dias" não aparece para os negócios antigos.
    //
    // Backfill idempotente via SQL cru — NÃO inventa datas: para cada
    // deal com etapa_desde vazio usa, na ordem:
    //   1. data da última atividade vinculada ao deal (referência do
    //      trabalho na etapa atual)
    //   2. data de atualização do deal
    //   3. data de criação do deal
    // etapa_desde_usuario recebe o owner do deal. Deals que já têm
    // etapa_desde preenchido NÃO são alterados (WHERE só pega vazio).
    // ------------------------------------------------------------------
    app
      .db()
      .newQuery(
        'UPDATE deals SET ' +
          'etapa_desde = COALESCE(' +
          '  (SELECT MAX(a.created) FROM activities a WHERE a.deal = deals.id),' +
          "  CASE WHEN COALESCE(updated, '') != '' THEN updated ELSE created END," +
          '  created' +
          '), ' +
          'etapa_desde_usuario = owner ' +
          'WHERE etapa_desde IS NULL ' +
          "OR etapa_desde = '' " +
          "OR etapa_desde = '0001-01-01 00:00:00.000Z'",
      )
      .execute()
    console.log('0010_backfill_etapa_desde: backfill executado (idempotente)')
  },
  (app) => {
    // down: não desfaz preenchimento de dados (operação idempotente e
    // não destrutiva — não há como distinguir o que foi preenchido aqui);
    // nada a reverter.
  },
)
