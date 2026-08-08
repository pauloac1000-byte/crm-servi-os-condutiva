migrate(
  (app) => {
    const stagesCol = new Collection({
      name: 'pipeline_stages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'order', type: 'number' },
        { name: 'color', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pipeline_stages_order ON pipeline_stages (`order`)'],
    })
    app.save(stagesCol)

    const contactsCol = new Collection({
      name: 'contacts',
      type: 'base',
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'company', type: 'text' },
        { name: 'role', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['lead', 'prospect', 'cliente', 'inativo'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        {
          name: 'owner',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contacts_owner ON contacts (owner)',
        'CREATE INDEX idx_contacts_status ON contacts (status)',
      ],
    })
    app.save(contactsCol)

    const dealsCol = new Collection({
      name: 'deals',
      type: 'base',
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'value', type: 'number' },
        {
          name: 'stage',
          type: 'relation',
          collectionId: stagesCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'contact',
          type: 'relation',
          collectionId: contactsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'owner',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'expected_close_date', type: 'date' },
        { name: 'priority', type: 'select', values: ['baixa', 'média', 'alta'], maxSelect: 1 },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_deals_stage ON deals (stage)',
        'CREATE INDEX idx_deals_contact ON deals (contact)',
        'CREATE INDEX idx_deals_owner ON deals (owner)',
      ],
    })
    app.save(dealsCol)

    const activitiesCol = new Collection({
      name: 'activities',
      type: 'base',
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          values: ['ligação', 'e-mail', 'reunião', 'follow-up'],
          maxSelect: 1,
        },
        { name: 'status', type: 'select', values: ['pendente', 'concluída'], maxSelect: 1 },
        { name: 'description', type: 'text' },
        { name: 'due_date', type: 'date' },
        {
          name: 'contact',
          type: 'relation',
          collectionId: contactsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'deal',
          type: 'relation',
          collectionId: dealsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'owner',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_activities_owner ON activities (owner)',
        'CREATE INDEX idx_activities_status ON activities (status)',
      ],
    })
    app.save(activitiesCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('activities'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('deals'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('contacts'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pipeline_stages'))
    } catch (_) {}
  },
)
