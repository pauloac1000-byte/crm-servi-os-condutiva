import pb from '@/lib/pocketbase/client'
import { User, UserRole } from '@/types/crm'

export interface CreateUserData {
  name: string
  email: string
  password: string
  role?: UserRole
}

export interface UpdateUserData {
  name?: string
  email?: string
  role?: UserRole
  password?: string
}

export async function getUsers(): Promise<User[]> {
  const records = await pb.collection('users').getFullList({
    sort: '-created',
  })
  return records as unknown as User[]
}

export async function getUser(id: string): Promise<User> {
  const record = await pb.collection('users').getOne(id)
  return record as unknown as User
}

export async function createUser(data: CreateUserData): Promise<User> {
  const record = await pb.collection('users').create({
    name: data.name,
    email: data.email,
    password: data.password,
    passwordConfirm: data.password,
    role: data.role || 'user',
  })
  return record as unknown as User
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const payload: Record<string, any> = {}

  if (typeof data.name !== 'undefined') payload.name = data.name
  if (typeof data.email !== 'undefined') payload.email = data.email
  if (typeof data.role !== 'undefined') payload.role = data.role
  if (data.password && data.password.trim().length > 0) {
    payload.password = data.password
    payload.passwordConfirm = data.password
  }

  const record = await pb.collection('users').update(id, payload)
  return record as unknown as User
}

export async function deleteUser(id: string): Promise<boolean> {
  return await pb.collection('users').delete(id)
}
