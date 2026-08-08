import pb from '@/lib/pocketbase/client'
import { Activity } from '@/types/crm'

export const getActivities = async (): Promise<Activity[]> => {
  return pb.collection('activities').getFullList<Activity>({
    sort: 'due_date',
    expand: 'contact,deal,owner',
  })
}

export const getActivity = async (id: string): Promise<Activity> => {
  return pb.collection('activities').getOne<Activity>(id, {
    expand: 'contact,deal,owner',
  })
}

export const createActivity = async (data: Partial<Activity>): Promise<Activity> => {
  return pb.collection('activities').create<Activity>(
    {
      ...data,
      owner: pb.authStore.record?.id,
    },
    { expand: 'contact,deal,owner' },
  )
}

export const updateActivity = async (id: string, data: Partial<Activity>): Promise<Activity> => {
  return pb.collection('activities').update<Activity>(id, data, {
    expand: 'contact,deal,owner',
  })
}

export const toggleActivityStatus = async (
  id: string,
  currentStatus: 'pendente' | 'concluída',
): Promise<Activity> => {
  const newStatus = currentStatus === 'pendente' ? 'concluída' : 'pendente'
  return pb.collection('activities').update<Activity>(
    id,
    { status: newStatus },
    {
      expand: 'contact,deal,owner',
    },
  )
}

export const deleteActivity = async (id: string): Promise<boolean> => {
  return pb.collection('activities').delete(id)
}
