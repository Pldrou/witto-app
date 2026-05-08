'use server'
import { db } from '@/db'
import { projects, milestones } from '@/db/schema'
import { getOrCreateUser } from '@/lib/auth'
import { refreshProjectMetrics } from '@/lib/metrics/refresh'
import { and, eq, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const MAX_MILESTONES_PER_PROJECT = 12
const MAX_LABEL_LENGTH = 80

async function assertOwnsProject(projectId: string, userId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)
  if (!row) throw new Error('Project not found')
}

async function loadOwnedMilestone(milestoneId: string, userId: string) {
  const [row] = await db
    .select({
      id: milestones.id,
      completedAt: milestones.completedAt,
      ownerId: projects.userId,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(eq(milestones.id, milestoneId))
    .limit(1)
  if (!row || row.ownerId !== userId) throw new Error('Milestone not found')
  return row
}

export async function createProject(formData: FormData) {
  const user = await getOrCreateUser()
  const name = String(formData.get('name') || '').trim()
  const url = String(formData.get('url') || '').trim() || null
  const githubRepo = String(formData.get('githubRepo') || '').trim() || null
  const stripeSecretKey = String(formData.get('stripeSecretKey') || '').trim() || null
  const milestonesText = String(formData.get('milestones') || '')

  if (!name) throw new Error('Name is required')

  const [project] = await db
    .insert(projects)
    .values({ userId: user.id, name, url, githubRepo, stripeSecretKey })
    .returning()

  const labels = milestonesText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_MILESTONES_PER_PROJECT)
    .map((line) => line.slice(0, MAX_LABEL_LENGTH))

  if (labels.length > 0) {
    await db.insert(milestones).values(
      labels.map((label, i) => ({ projectId: project.id, label, position: i })),
    )
  }

  revalidatePath('/dashboard')
}

export async function refreshProject(projectId: string) {
  const user = await getOrCreateUser()

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1)

  if (!project) throw new Error('Project not found')

  await refreshProjectMetrics(project.id)
  revalidatePath('/dashboard')
}

export async function addMilestone(projectId: string, formData: FormData) {
  const user = await getOrCreateUser()
  await assertOwnsProject(projectId, user.id)

  const label = String(formData.get('label') || '').trim().slice(0, MAX_LABEL_LENGTH)
  if (!label) return

  const [{ nextPos }] = await db
    .select({ nextPos: max(milestones.position) })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))

  await db.insert(milestones).values({
    projectId,
    label,
    position: (nextPos ?? -1) + 1,
  })

  revalidatePath('/dashboard')
}

export async function toggleMilestone(milestoneId: string) {
  const user = await getOrCreateUser()
  const m = await loadOwnedMilestone(milestoneId, user.id)

  await db
    .update(milestones)
    .set({ completedAt: m.completedAt ? null : new Date() })
    .where(eq(milestones.id, milestoneId))

  revalidatePath('/dashboard')
}

export async function removeMilestone(milestoneId: string) {
  const user = await getOrCreateUser()
  await loadOwnedMilestone(milestoneId, user.id)

  await db.delete(milestones).where(eq(milestones.id, milestoneId))
  revalidatePath('/dashboard')
}
