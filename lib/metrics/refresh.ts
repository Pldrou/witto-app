import { db } from '@/db'
import { projects, metricSnapshots } from '@/db/schema'
import { fetchGithubRepoData } from '@/lib/integrations/github'
import { eq } from 'drizzle-orm'

export async function refreshProjectMetrics(projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) return { skipped: 'not-found' as const }
  if (!project.githubRepo) return { skipped: 'no-github' as const }

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
  return { refreshed: project.id }
}
