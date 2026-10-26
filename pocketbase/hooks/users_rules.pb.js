// pb_hooks for users collection security and defaults
onRecordCreate((e) => {
  // Ensure default role is 'user' if not explicitly defined
  const role = e.record.getString('role')
  if (!role) {
    e.record.set('role', 'user')
  }
}, 'users')

onRecordUpdate((e) => {
  // If an admin updates their own record, protect against self-demotion
  if (e.auth && e.auth.id === e.record.id) {
    const originalRole = e.record.original().getString('role')
    const newRole = e.record.getString('role')
    if (originalRole === 'admin' && newRole !== 'admin') {
      throw new ForbiddenError(
        'Administradores não podem remover seu próprio papel de administrador.',
      )
    }
  }
}, 'users')

onRecordDelete((e) => {
  // Prevent admin from deleting their own account
  if (e.auth && e.auth.id === e.record.id) {
    throw new ForbiddenError('Você não pode excluir sua própria conta de administrador.')
  }
}, 'users')
