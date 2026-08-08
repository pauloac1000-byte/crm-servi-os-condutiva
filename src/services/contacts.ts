import pb from '@/lib/pocketbase/client'
import { Contact } from '@/types/crm'

export const getContacts = async (): Promise<Contact[]> => {
  return pb.collection('contacts').getFullList<Contact>({ sort: '-created' })
}

export const getContact = async (id: string): Promise<Contact> => {
  return pb.collection('contacts').getOne<Contact>(id)
}

export const createContact = async (data: Partial<Contact>): Promise<Contact> => {
  return pb.collection('contacts').create<Contact>({
    ...data,
    owner: pb.authStore.record?.id,
  })
}

export const updateContact = async (id: string, data: Partial<Contact>): Promise<Contact> => {
  return pb.collection('contacts').update<Contact>(id, data)
}

export const deleteContact = async (id: string): Promise<boolean> => {
  return pb.collection('contacts').delete(id)
}
