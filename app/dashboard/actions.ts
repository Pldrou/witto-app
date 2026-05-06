'use server'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { getOrCreateUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createProject(formData: FormData) {
  const user = await getOrCreateUser()
  const name = String(formData.get('name') || '').trim()
  const url = String(formData.get('url') || '').trim() || null
  const githubRepo = String(formData.get('githubRepo') || '').trim() || null

  if (!name) throw new Error('Name is required')

  await db.insert(projects).values({
    userId: user.id,
    name,
    url,
    githubRepo,
  })

  revalidatePath('/dashboard')
}
