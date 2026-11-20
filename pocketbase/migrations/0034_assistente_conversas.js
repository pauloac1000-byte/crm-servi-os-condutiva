/// <reference path="../pb_data/types.d.ts" />
// 0034 — coleção de conversas do assistente de IA (persistência real das trocas).
// Cada troca grava: usuário, pergunta, resposta, identificador de conversa e modelo.
// Regras de API: TODAS restritas ao próprio usuário (usuario = auth id) — inclusive
// create/update/delete, que o hook grava com e.auth (superuser não passa por aqui).
// Nenhum usuário com perfil comercial/técnico vê conversa de outro; sem regra de admin.
migrate(
  (app) => {
    const col = new Collection({
      name: 'assistente_conversas',
      type: 'base',
      listRule: "@request.auth.id != '' && usuario = @request.auth.id",
      viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
      createRule: "@request.auth.id != '' && usuario = @request.auth.id",
      updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
      deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
      fields: [
        {
          name: 'usuario',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'pergunta', type: 'text', required: true, max: 2500 },
        { name: 'resposta', type: 'text', required: true, max: 12000 },
        { name: 'conversa_id', type: 'text', required: true, max: 64 },
        { name: 'modelo', type: 'text', required: false, max: 200 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_assistente_conversas_usuario ON assistente_conversas (usuario)',
        'CREATE INDEX idx_assistente_conversas_conversa ON assistente_conversas (conversa_id)',
        'CREATE INDEX idx_assistente_conversas_usuario_conversa ON assistente_conversas (usuario, conversa_id, created)',
      ],
    })
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('assistente_conversas')
    app.delete(col)
  },
)
