migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminUser

    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'pauloac1000@gmail.com')
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail('pauloac1000@gmail.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Paulo')
      app.save(adminUser)
    }

    const stagesCol = app.findCollectionByNameOrId('pipeline_stages')
    const defaultStages = [
      { name: 'Prospecção', order: 1, color: '#6366F1' },
      { name: 'Qualificação', order: 2, color: '#0EA5E9' },
      { name: 'Proposta', order: 3, color: '#F59E0B' },
      { name: 'Negociação', order: 4, color: '#8B5CF6' },
      { name: 'Fechado/Ganho', order: 5, color: '#10B981' },
      { name: 'Fechado/Perdido', order: 6, color: '#EF4444' },
    ]

    const stageMap = {}
    for (let i = 0; i < defaultStages.length; i++) {
      const s = defaultStages[i]
      let record
      try {
        record = app.findFirstRecordByData('pipeline_stages', 'name', s.name)
      } catch (_) {
        record = new Record(stagesCol)
        record.set('name', s.name)
        record.set('order', s.order)
        record.set('color', s.color)
        app.save(record)
      }
      stageMap[s.name] = record.id
    }

    const contactsCol = app.findCollectionByNameOrId('contacts')
    const sampleContacts = [
      {
        name: 'Mariana Souza',
        email: 'mariana@technova.com.br',
        phone: '(11) 98765-4321',
        company: 'TechNova Solutions',
        role: 'CTO',
        status: 'cliente',
        notes: 'Cliente chave de serviços cloud.',
      },
      {
        name: 'Rodrigo Fonseca',
        email: 'rodrigo@logiconect.com.br',
        phone: '(11) 97123-8899',
        company: 'LogiConect',
        role: 'Diretor de Operações',
        status: 'prospect',
        notes: 'Interessado em automação de frota.',
      },
      {
        name: 'Camila Duarte',
        email: 'camila@inovahealth.com.br',
        phone: '(21) 99887-1122',
        company: 'InovaHealth',
        role: 'Gerente de TI',
        status: 'lead',
        notes: 'Mapeando orçamento para 2026.',
      },
      {
        name: 'Fernando Alves',
        email: 'falves@bancoprimus.com.br',
        phone: '(11) 96543-2109',
        company: 'Banco Primus',
        role: 'VP de Engenharia',
        status: 'cliente',
        notes: 'Contrato renovável anualmente.',
      },
      {
        name: 'Beatriz Mendes',
        email: 'beatriz@nexovarejo.com.br',
        phone: '(31) 98444-5566',
        company: 'Nexo Varejo',
        role: 'Head de Inovação',
        status: 'prospect',
        notes: 'Avaliando integração omnichannel.',
      },
      {
        name: 'Lucas Pinheiro',
        email: 'lucas@sinergiabpo.com.br',
        phone: '(41) 99111-2233',
        company: 'Sinergia BPO',
        role: 'CEO',
        status: 'lead',
        notes: 'Precisa de governança de TI.',
      },
    ]

    const contactMap = {}
    for (let i = 0; i < sampleContacts.length; i++) {
      const c = sampleContacts[i]
      let record
      try {
        record = app.findFirstRecordByData('contacts', 'email', c.email)
      } catch (_) {
        record = new Record(contactsCol)
        record.set('name', c.name)
        record.set('email', c.email)
        record.set('phone', c.phone)
        record.set('company', c.company)
        record.set('role', c.role)
        record.set('status', c.status)
        record.set('notes', c.notes)
        record.set('owner', adminUser.id)
        app.save(record)
      }
      contactMap[c.name] = record.id
    }

    const dealsCol = app.findCollectionByNameOrId('deals')
    const sampleDeals = [
      {
        title: 'Implantação de ERP — Fase 1',
        value: 85000,
        stage: 'Proposta',
        contact: 'Mariana Souza',
        priority: 'alta',
        expected_close_date: '2026-09-15 00:00:00.000Z',
      },
      {
        title: 'Manutenção de Infraestrutura Cloud',
        value: 42000,
        stage: 'Qualificação',
        contact: 'Rodrigo Fonseca',
        priority: 'média',
        expected_close_date: '2026-09-30 00:00:00.000Z',
      },
      {
        title: 'Projeto de Cloud Híbrida e Cyber',
        value: 150000,
        stage: 'Negociação',
        contact: 'Fernando Alves',
        priority: 'alta',
        expected_close_date: '2026-08-28 00:00:00.000Z',
      },
      {
        title: 'Consultoria de Arquitetura DevOps',
        value: 28000,
        stage: 'Prospecção',
        contact: 'Camila Duarte',
        priority: 'baixa',
        expected_close_date: '2026-10-10 00:00:00.000Z',
      },
      {
        title: 'Modernização de Legado & APIs',
        value: 110000,
        stage: 'Fechado/Ganho',
        contact: 'Mariana Souza',
        priority: 'alta',
        expected_close_date: '2026-07-20 00:00:00.000Z',
      },
      {
        title: 'Licenciamento & Suporte Dedicado',
        value: 65000,
        stage: 'Fechado/Ganho',
        contact: 'Fernando Alves',
        priority: 'média',
        expected_close_date: '2026-08-01 00:00:00.000Z',
      },
      {
        title: 'Integração de Sistemas de Varejo',
        value: 55000,
        stage: 'Proposta',
        contact: 'Beatriz Mendes',
        priority: 'média',
        expected_close_date: '2026-09-20 00:00:00.000Z',
      },
      {
        title: 'Outsourcing de TI & BPO Especializado',
        value: 95000,
        stage: 'Qualificação',
        contact: 'Lucas Pinheiro',
        priority: 'alta',
        expected_close_date: '2026-10-05 00:00:00.000Z',
      },
      {
        title: 'Auditoria de Segurança de Dados',
        value: 22000,
        stage: 'Fechado/Perdido',
        contact: 'Camila Duarte',
        priority: 'baixa',
        expected_close_date: '2026-07-15 00:00:00.000Z',
      },
    ]

    const dealMap = {}
    for (let i = 0; i < sampleDeals.length; i++) {
      const d = sampleDeals[i]
      let record
      try {
        record = app.findFirstRecordByData('deals', 'title', d.title)
      } catch (_) {
        record = new Record(dealsCol)
        record.set('title', d.title)
        record.set('value', d.value)
        record.set('stage', stageMap[d.stage])
        record.set('contact', contactMap[d.contact])
        record.set('owner', adminUser.id)
        record.set('priority', d.priority)
        record.set('expected_close_date', d.expected_close_date)
        app.save(record)
      }
      dealMap[d.title] = record.id
    }

    const activitiesCol = app.findCollectionByNameOrId('activities')
    const sampleActivities = [
      {
        title: 'Reunião de apresentação técnica',
        type: 'reunião',
        status: 'pendente',
        contact: 'Rodrigo Fonseca',
        deal: 'Manutenção de Infraestrutura Cloud',
        due_date: '2026-08-20 00:00:00.000Z',
        description: 'Apresentar arquitetura proposta.',
      },
      {
        title: 'Enviar proposta comercial atualizada',
        type: 'e-mail',
        status: 'pendente',
        contact: 'Mariana Souza',
        deal: 'Implantação de ERP — Fase 1',
        due_date: '2026-08-18 00:00:00.000Z',
        description: 'Ajustar valores do SLA.',
      },
      {
        title: 'Follow-up sobre alinhamento jurídico',
        type: 'follow-up',
        status: 'pendente',
        contact: 'Fernando Alves',
        deal: 'Projeto de Cloud Híbrida e Cyber',
        due_date: '2026-08-22 00:00:00.000Z',
        description: 'Verificar minuta do contrato.',
      },
      {
        title: 'Ligação para mapeamento de requisitos',
        type: 'ligação',
        status: 'pendente',
        contact: 'Camila Duarte',
        deal: 'Consultoria de Arquitetura DevOps',
        due_date: '2026-08-25 00:00:00.000Z',
        description: 'Discutir tamanho da equipe de TI.',
      },
      {
        title: 'Validar escopo final com time de arquitetura',
        type: 'reunião',
        status: 'concluída',
        contact: 'Beatriz Mendes',
        deal: 'Integração de Sistemas de Varejo',
        due_date: '2026-08-10 00:00:00.000Z',
        description: 'Alinhamento técnico concluído.',
      },
    ]

    for (let i = 0; i < sampleActivities.length; i++) {
      const act = sampleActivities[i]
      try {
        app.findFirstRecordByData('activities', 'title', act.title)
      } catch (_) {
        const record = new Record(activitiesCol)
        record.set('title', act.title)
        record.set('type', act.type)
        record.set('status', act.status)
        record.set('description', act.description)
        record.set('due_date', act.due_date)
        record.set('contact', contactMap[act.contact])
        record.set('deal', dealMap[act.deal])
        record.set('owner', adminUser.id)
        app.save(record)
      }
    }
  },
  (app) => {},
)
