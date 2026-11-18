/// <reference path="../pb_data/types.d.ts" />
// 0030 — perfil de acesso do usuário (campo select "perfil" na coleção users).
// Valores: admin | comercial | tecnico (padrão: comercial).
// Backfill via SQL cru (JSVM: record.set de dados em massa pode não persistir):
//   - role = 'admin'  → perfil = 'admin'
//   - demais usuários → perfil = 'comercial'
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('perfil')) {
      users.fields.add(
        new SelectField({
          name: 'perfil',
          required: false,
          maxSelect: 1,
          values: ['admin', 'comercial', 'tecnico'],
        }),
      )
    }
    app.save(users)

    // backfill SQL cru — evita o problema conhecido de record.set em massa no JSVM
    app
      .db()
      .newQuery(
        "UPDATE users SET perfil = 'admin' WHERE role = 'admin' AND (perfil = '' OR perfil IS NULL)",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE users SET perfil = 'comercial' WHERE (role = '' OR role IS NULL OR role != 'admin') AND (perfil = '' OR perfil IS NULL)",
      )
      .execute()
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const f = users.fields.getByName('perfil')
    if (f) {
      users.fields.removeByName('perfil')
    }
    app.save(users)
  },
)
