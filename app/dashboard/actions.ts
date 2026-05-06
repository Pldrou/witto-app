'use server'
import { db } from '@/db'
import { projects, metricSnapshots } from '@/db/schema'
import { getOrCreateUser } from '@/lib/auth'
import { fetchGithubRepoData } from '@/lib/integrations/github'
import { and, eq } from 'drizzle-orm'
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

export async function refreshProject(projectId: string) {
  const user = await getOrCreateUser()

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1)

  if (!project) throw new Error('Project not found')
  if (!project.githubRepo) throw new Error('No GitHub repo on this project')

  const data = await fetchGithubRepoData(project.githubRepo)
  const now = new Date()

  const rows: typeof metricSnapshots.$inferInsert[] = [
    { projectId: project.id, metric: 'github_stars', value: String(data.stars), capturedAt: now },
  ]
  if (data.lastCommitAt) {
    rows.push({
      projectId: project.id,
      metric: 'github_last_commit_at',
      value: String(data.lastCommitAt.getTime()),
      capturedAt: now,
    })
  }

  await db.insert(metricSnapshots).values(rows)
  revalidatePath('/dashboard')
}
