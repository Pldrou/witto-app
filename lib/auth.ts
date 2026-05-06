import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function getOrCreateUser() {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (existing[0]) return existing[0]

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress
  if (!email) throw new Error('No email on Clerk user')

  const [created] = await db.insert(users).values({ id: userId, email }).returning()
  return created
}
