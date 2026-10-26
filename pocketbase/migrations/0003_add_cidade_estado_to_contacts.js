migrate(
  (app) => {
    const contactsCol = app.findCollectionByNameOrId('contacts')

    let modified = false
    if (!contactsCol.fields.getByName('cidade')) {
      contactsCol.fields.add(
        new TextField({
          name: 'cidade',
          required: false,
        }),
      )
      modified = true
    }

    if (!contactsCol.fields.getByName('estado')) {
      contactsCol.fields.add(
        new TextField({
          name: 'estado',
          required: false,
        }),
      )
      modified = true
    }

    if (modified) {
      app.save(contactsCol)
    }

    // Atualizar dados de exemplo existentes com cidade e estado
    const cityStateMap = [
      { email: 'mariana@technova.com.br', cidade: 'São Paulo', estado: 'SP' },
      { email: 'rodrigo@logiconect.com.br', cidade: 'Campinas', estado: 'SP' },
      { email: 'camila@inovahealth.com.br', cidade: 'Rio de Janeiro', estado: 'RJ' },
      { email: 'falves@bancoprimus.com.br', cidade: 'São Paulo', estado: 'SP' },
      { email: 'beatriz@nexovarejo.com.br', cidade: 'Belo Horizonte', estado: 'MG' },
      { email: 'lucas@sinergiabpo.com.br', cidade: 'Curitiba', estado: 'PR' },
    ]

    for (let i = 0; i < cityStateMap.length; i++) {
      const item = cityStateMap[i]
      try {
        const record = app.findFirstRecordByData('contacts', 'email', item.email)
        let needsUpdate = false
        if (!record.getString('cidade')) {
          record.set('cidade', item.cidade)
          needsUpdate = true
        }
        if (!record.getString('estado')) {
          record.set('estado', item.estado)
          needsUpdate = true
        }
        if (needsUpdate) {
          app.save(record)
        }
      } catch (_) {}
    }

    // Tratar também o registro do Hebertt (Itanhaém SP mencionado em notes)
    try {
      const record = app.findFirstRecordByFilter('contacts', "name ~ 'Hebertt'")
      if (record) {
        let needsUpdate = false
        if (!record.getString('cidade')) {
          record.set('cidade', 'Itanhaém')
          needsUpdate = true
        }
        if (!record.getString('estado')) {
          record.set('estado', 'SP')
          needsUpdate = true
        }
        if (needsUpdate) {
          app.save(record)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const contactsCol = app.findCollectionByNameOrId('contacts')
      const cidadeField = contactsCol.fields.getByName('cidade')
      if (cidadeField) {
        contactsCol.fields.removeByName('cidade')
      }
      const estadoField = contactsCol.fields.getByName('estado')
      if (estadoField) {
        contactsCol.fields.removeByName('estado')
      }
      app.save(contactsCol)
    } catch (_) {}
  },
)
