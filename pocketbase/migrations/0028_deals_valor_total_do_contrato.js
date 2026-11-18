// Migration 0028 — deals.valor_total passa a ser calculado a partir do
// CONTRATO vinculado (contratos.negocio), não mais de campos do próprio lead
// (valor_mensal/prazo_contrato_meses saíram do formulário de lead).
//
// Backfill: para cada deal, soma o valor mensal × prazo (em meses) do contrato
// vinculado. Prazo = diferença data_fim − data_inicio (30,44 dias/mês,
// arredondada), o mesmo critério do motor de KPIs (src/services/kpis.ts).
// Sem contrato vinculado ou sem datas: valor_total = 0.
//
// Backfill via SQL cru (regra do projeto: record.set de campo no JSVM pode não
// persistir em backfill de migration).
migrate(
  (app) => {
    app
      .db()
      .newQuery(
        `UPDATE deals SET
           valor_total = COALESCE((
             SELECT ROUND(
               c.valor_mensal *
               CASE
                 WHEN c.data_inicio IS NOT NULL AND c.data_fim IS NOT NULL
                   THEN MAX(ROUND((julianday(c.data_fim) - julianday(c.data_inicio)) / 30.44), 0)
                 ELSE 12
               END
             )
             FROM contratos c
             WHERE c.negocio = deals.id
             ORDER BY c.created DESC
             LIMIT 1
           ), 0)
         WHERE valor_total IS NULL OR valor_total = 0 OR valor_total != COALESCE((
             SELECT ROUND(
               c.valor_mensal *
               CASE
                 WHEN c.data_inicio IS NOT NULL AND c.data_fim IS NOT NULL
                   THEN MAX(ROUND((julianday(c.data_fim) - julianday(c.data_inicio)) / 30.44), 0)
                 ELSE 12
               END
             )
             FROM contratos c
             WHERE c.negocio = deals.id
             ORDER BY c.created DESC
             LIMIT 1
           ), 0)`,
      )
      .execute()
  },
  (app) => {
    // rollback: recálculo idêntico (idempotente); não há como restaurar os
    // valores derivados do lead — eles já não existem mais na tela.
    app
      .db()
      .newQuery(
        `UPDATE deals SET valor_total = COALESCE((
           SELECT ROUND(
             c.valor_mensal *
             CASE
               WHEN c.data_inicio IS NOT NULL AND c.data_fim IS NOT NULL
                 THEN MAX(ROUND((julianday(c.data_fim) - julianday(c.data_inicio)) / 30.44), 0)
               ELSE 12
             END
           )
           FROM contratos c
           WHERE c.negocio = deals.id
           ORDER BY c.created DESC
           LIMIT 1
         ), 0)`,
      )
      .execute()
  },
)
