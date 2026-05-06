import { db } from '@/db'
import { projects, metricSnapshots } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { getOrCreateUser } from '@/lib/auth'
import { createProject, refreshProject } from './actions'

async function getLatestMetric(projectId: string, metric: string) {
  const [row] = await db
    .select()
    .from(metricSnapshots)
    .where(and(eq(metricSnapshots.projectId, projectId), eq(metricSnapshots.metric, metric)))
    .orderBy(desc(metricSnapshots.capturedAt))
    .limit(1)
  return row
}

function formatDaysAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default async function DashboardPage() {
  const user = await getOrCreateUser()
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))

  const enriched = await Promise.all(
    userProjects.map(async (p) => {
      const [stars, lastCommit] = await Promise.all([
        getLatestMetric(p.id, 'github_stars'),
        getLatestMetric(p.id, 'github_last_commit_at'),
      ])
      return { ...p, stars, lastCommit }
    })
  )

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Your projects</h1>

      <form action={createProject} className="mb-8 space-y-3 rounded-lg border p-4">
        <input name="name" placeholder="Project name" required className="w-full rounded border px-3 py-2" />
        <input name="url" placeholder="URL (https://...)" className="w-full rounded border px-3 py-2" />
        <input name="githubRepo" placeholder="GitHub repo (owner/repo)" className="w-full rounded border px-3 py-2" />
        <button type="submit" className="rounded-md bg-black px-4 py-2 text-white">Add project</button>
      </form>

      {enriched.length === 0 ? (
        <p className="text-gray-500">No projects yet. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {enriched.map((p) => (
            <li key={p.id} className="rounded border p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium">{p.name}</div>
                  {p.url && <div className="text-sm text-gray-600">{p.url}</div>}
                  {p.githubRepo && <div className="text-sm text-gray-600">github.com/{p.githubRepo}</div>}
                  {(p.stars || p.lastCommit) && (
                    <div className="mt-2 flex gap-4 text-sm text-gray-700">
                      {p.stars && <span>⭐ {p.stars.value}</span>}
                      {p.lastCommit && (
                        <span>last commit {formatDaysAgo(new Date(Number(p.lastCommit.value)))}</span>
                      )}
                    </div>
                  )}
                </div>
                {p.githubRepo && (
                  <form action={refreshProject.bind(null, p.id)}>
                    <button type="submit" className="rounded border px-3 py-1 text-sm hover:bg-gray-100">
                      Refresh
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
