/// <reference path="../pb_data/types.d.ts" />
// migration 0032 — remove as colunas órfãs "valor_mensal" e
// "prazo_contrato_meses" da coleção "deals".
//
// Órfãs desde a rodada 0.0.62: o formulário de lead não tem mais esses
// campos e todo cálculo (valor_total do lead, movimentos de receita, NRR,
// RCS, PDF) lê valor/prazo do CONTRATO vinculado (coleção "contratos",
// que mantém seus próprios valor_mensal e prazo_contrato_meses intocados).
// Valores antigos nessas colunas podem ser descartados (aprovado pelo
// usuário). Apenas a definição do campo sai — nenhum registro é alterado.
//
// Idempotente: só remove o campo se ele existir; e.next() não se aplica
// aqui (migration, não hook de registro).
migrate(
  (app) => {
    const deals = app.findCollectionByNameOrId('deals')

    const fMensal = deals.fields.getByName('valor_mensal')
    if (fMensal) {
      deals.fields.removeByName('valor_mensal')
    }

    const fPrazo = deals.fields.getByName('prazo_contrato_meses')
    if (fPrazo) {
      deals.fields.removeByName('prazo_contrato_meses')
    }

    app.save(deals)
  },
  (app) => {
    // rollback: recria os campos removidos (sem dados — os valores antigos
    // foram descartados com aprovação do usuário)
    const deals = app.findCollectionByNameOrId('deals')
    if (!deals.fields.getByName('valor_mensal')) {
      deals.fields.add(new NumberField({ name: 'valor_mensal' }))
    }
    if (!deals.fields.getByName('prazo_contrato_meses')) {
      deals.fields.add(new NumberField({ name: 'prazo_contrato_meses', onlyInt: true, min: 0 }))
    }
    app.save(deals)
  },
)
