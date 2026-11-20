/// <reference path="../pb_data/types.d.ts" />
// 0036 — assistente_logs legível pelo admin (painel de uso do assistente).
// Regras de API mudam de null (só superuser) para leitura por perfil admin
// (mesma expressão das demais telas admin, migration 0031: perfil='admin' ou
// role='admin'). Escrita continua fechada (null): os registros nascem só no
// hook assistente_ia.pb.js, com contexto de superuser. Nenhum dado é tocado.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('assistente_logs')
    const regraAdmin =
      "@request.auth.id != '' && (@request.auth.perfil = 'admin' || @request.auth.role = 'admin')"
    col.listRule = regraAdmin
    col.viewRule = regraAdmin
    col.createRule = null
    col.updateRule = null
    col.deleteRule = null
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('assistente_logs')
    col.listRule = null
    col.viewRule = null
    col.createRule = null
    col.updateRule = null
    col.deleteRule = null
    app.save(col)
  },
)
