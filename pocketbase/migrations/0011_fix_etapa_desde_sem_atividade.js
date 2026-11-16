migrate(
  (app) => {
    // ------------------------------------------------------------------
    // Refino do backfill (0010): os deals SEM atividade vinculada
    // receberam etapa_desde = updated, que nesta base é o timestamp do
    // deploy da 0008 (2026-11-16 17:37:41) — um artefato, não uma
    // referência real de entrada na etapa. O pedido é usar última
    // atividade OU criação do deal.
    //
    // Regra idempotente: para deals cujo etapa_desde é igual ao
    // updated (artefato do deploy), que não têm nenhuma atividade
    // vinculada e cuja criação é anterior a essa data, etapa_desde
    // passa a ser a data de CRIAÇÃO do deal (referência real, não
    // inventada). Deals com atividade vinculada ou com etapa_desde
    // distinto do updated não são tocados.
    // ------------------------------------------------------------------
    app
      .db()
      .newQuery(
        'UPDATE deals SET etapa_desde = created ' +
          'WHERE etapa_desde = updated ' +
          "AND COALESCE(updated, '') != COALESCE(created, '') " +
          'AND created < updated ' +
          'AND NOT EXISTS (' +
          '  SELECT 1 FROM activities a WHERE a.deal = deals.id' +
          ')',
      )
      .execute()
    console.log('0011_fix_etapa_desde_sem_atividade: deals sem atividade usam a criação')
  },
  (app) => {
    // down: não reverte preenchimento de dados (operação idempotente e
    // não destrutiva); nada a desfazer.
  },
)
