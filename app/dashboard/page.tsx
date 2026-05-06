import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getOrCreateUser } from '@/lib/auth'
import { createProject } from './actions'

export default async function DashboardPage() {
  const user = await getOrCreateUser()
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Your projects</h1>

      <form action={createProject} className="mb-8 space-y-3 rounded-lg border p-4">
        <input name="name" placeholder="Project name" required className="w-full rounded border px-3 py-2" />
        <input name="url" placeholder="URL (https://...)" className="w-full rounded border px-3 py-2" />
        <input name="githubRepo" placeholder="GitHub repo (owner/repo)" className="w-full rounded border px-3 py-2" />
        <button type="submit" className="rounded-md bg-black px-4 py-2 text-white">
          Add project
        </button>
      </form>

      {userProjects.length === 0 ? (
        <p className="text-gray-500">No projects yet. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {userProjects.map((p) => (
            <li key={p.id} className="rounded border p-3">
              <div className="font-medium">{p.name}</div>
              {p.url && <div className="text-sm text-gray-600">{p.url}</div>}
              {p.githubRepo && <div className="text-sm text-gray-600">github.com/{p.githubRepo}</div>}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
