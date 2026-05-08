type StripeRevenue = {
  cents30d: number
  currency: string
}

export async function fetchStripeRevenue(secretKey: string): Promise<StripeRevenue> {
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

  let totalCents = 0
  let currency = 'usd'
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const params = new URLSearchParams({
      'created[gte]': String(thirtyDaysAgo),
      limit: '100',
    })
    if (startingAfter) params.set('starting_after', startingAfter)

    const res = await fetch(`https://api.stripe.com/v1/charges?${params}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!res.ok) throw new Error(`Stripe fetch failed: ${res.status}`)

    const data = await res.json()

    for (const charge of data.data) {
      if (charge.status === 'succeeded') {
        totalCents += charge.amount - (charge.amount_refunded || 0)
        currency = charge.currency
      }
    }

    hasMore = data.has_more && data.data.length > 0
    if (hasMore) startingAfter = data.data[data.data.length - 1].id
  }

  return { cents30d: totalCents, currency }
}
