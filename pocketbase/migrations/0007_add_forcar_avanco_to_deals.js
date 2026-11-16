// deals: campo booleano auxiliar "forcar_avanco" — sinaliza ao hook de
// validação que o admin está forçando o avanço de etapa (nunca é exibido
// na interface; o hook o reset para false após cada avanço).
migrate(
  (app) => {
    const dealsCol = app.findCollectionByNameOrId('deals')
    if (!dealsCol.fields.getByName('forcar_avanco')) {
      dealsCol.fields.add(new BoolField({ name: 'forcar_avanco' }))
      app.save(dealsCol)
    }
  },
  (app) => {
    try {
      const dealsCol = app.findCollectionByNameOrId('deals')
      const field = dealsCol.fields.getByName('forcar_avanco')
      if (field) dealsCol.fields.removeByName('forcar_avanco')
      app.save(dealsCol)
    } catch (_) {}
  },
)
