migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar campo 'role' (select: admin, user) se ainda não existir
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['admin', 'user'],
          maxSelect: 1,
        }),
      )
    }

    // 2. Atualizar regras de acesso de users:
    // listRule / viewRule: administradores podem ver todos; usuários normais vêem a si mesmos
    usersCol.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    usersCol.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"

    // createRule:
    // Público / signup: apenas sem especificar role ou role='user'
    // Logado: apenas admin pode criar e pode atribuir qualquer role
    usersCol.createRule =
      "(@request.auth.id = '' && @request.body.role != 'admin') || (@request.auth.id != '' && @request.auth.role = 'admin')"

    // updateRule:
    // Admin pode editar qualquer usuário.
    // Usuário comum pode editar apenas a si mesmo, e NUNCA pode alterar o campo 'role'
    usersCol.updateRule =
      "(@request.auth.id != '' && @request.auth.role = 'admin') || (id = @request.auth.id && @request.body.role:changed = false)"

    // deleteRule:
    // Apenas admin pode apagar outros usuários (e o backend/hook/UI impede auto-deleção)
    usersCol.deleteRule =
      "@request.auth.id != '' && @request.auth.role = 'admin' && id != @request.auth.id"

    app.save(usersCol)

    // 3. Garantir que paulo@condutiva.com.br esteja cadastrado e marcado como admin
    try {
      const pauloRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'paulo@condutiva.com.br')
      pauloRecord.set('role', 'admin')
      app.save(pauloRecord)
    } catch (_) {
      const newAdmin = new Record(usersCol)
      newAdmin.setEmail('paulo@condutiva.com.br')
      newAdmin.setPassword('Skip@Pass')
      newAdmin.setVerified(true)
      newAdmin.set('name', 'Paulo Christini')
      newAdmin.set('role', 'admin')
      app.save(newAdmin)
    }

    // 4. Também garantir papel 'user' como padrão para usuários existentes sem role definido
    try {
      const records = app.findRecordsByFilter('_pb_users_auth_', "role = '' || role = null")
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        if (r.getString('email') === 'paulo@condutiva.com.br') {
          r.set('role', 'admin')
        } else {
          r.set('role', 'user')
        }
        app.save(r)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const roleField = usersCol.fields.getByName('role')
      if (roleField) {
        usersCol.fields.removeByName('role')
      }
      usersCol.listRule = 'id = @request.auth.id'
      usersCol.viewRule = 'id = @request.auth.id'
      usersCol.createRule = ''
      usersCol.updateRule = 'id = @request.auth.id'
      usersCol.deleteRule = 'id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}
  },
)
