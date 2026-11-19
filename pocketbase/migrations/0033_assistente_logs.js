/// <reference path="../pb_data/types.d.ts" />
// 0033 — coleção de log do assistente de IA (rota POST /api/assistente-ia).
// Cada pergunta grava: data (created), usuário, modelo, tokens, latência e erro (categoria, sem a chave).
// Regras de API todas null = somente superuser/admin lê; nenhum usuário comum lista os logs.
migrate(
  (app) => {
    const col = new Collection({
      name: 'assistente_logs',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'usuario_id', type: 'text', required: false, max: 64 },
        { name: 'modelo', type: 'text', required: false, max: 200 },
        { name: 'tokens', type: 'number', required: false, onlyInt: true, min: 0 },
        { name: 'latencia_ms', type: 'number', required: false, onlyInt: true, min: 0 },
        { name: 'erro', type: 'text', required: false, max: 300 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_assistente_logs_usuario ON assistente_logs (usuario_id)'],
    })
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('assistente_logs')
    app.delete(col)
  },
)
