type GithubRepoData = {
  stars: number
  lastCommitAt: Date | null
}

export async function fetchGithubRepoData(repoSlug: string): Promise<GithubRepoData> {
  if (!/^[^/]+\/[^/]+$/.test(repoSlug)) {
    throw new Error(`Invalid repo slug: ${repoSlug}`)
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'witto',
  }

  const repoRes = await fetch(`https://api.github.com/repos/${repoSlug}`, { headers })
  if (!repoRes.ok) throw new Error(`GitHub repo fetch failed: ${repoRes.status}`)
  const repo = await repoRes.json()

  const commitsRes = await fetch(
    `https://api.github.com/repos/${repoSlug}/commits?per_page=1`,
    { headers }
  )
  const commits = commitsRes.ok ? await commitsRes.json() : []
  const lastCommitAt = commits[0]?.commit?.committer?.date
    ? new Date(commits[0].commit.committer.date)
    : null

  return { stars: repo.stargazers_count ?? 0, lastCommitAt }
}
