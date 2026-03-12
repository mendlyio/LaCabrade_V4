import { HttpTypes } from "@medusajs/types"

type Session = HttpTypes.StorePaymentSession

const SESSION_PRIORITY = [
  "pending",
  "requires_more",
  "authorized",
  "captured",
] as const

/**
 * Retourne la session la plus exploitable pour le checkout Medusa v2.
 * Stripe/Klarna/Alma peuvent revenir avec un statut différent de "pending"
 * pendant le flow de redirection.
 */
export const getActivePaymentSession = (
  sessions?: Session[] | null,
  providerId?: string
) => {
  if (!sessions?.length) {
    return undefined
  }

  const scoped = (providerId
    ? sessions.filter((session) => session.provider_id === providerId)
    : sessions
  ).sort((a, b) => {
    const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
    const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime()

    return bTime - aTime
  })

  if (!scoped.length) {
    return undefined
  }

  const selectedSession = scoped.find(
    (session) =>
      (session as Session & { is_selected?: boolean }).is_selected &&
      session.status !== "canceled"
  )

  if (selectedSession) {
    return selectedSession
  }

  for (const status of SESSION_PRIORITY) {
    const match = scoped.find((session) => session.status === status)
    if (match) {
      return match
    }
  }

  return scoped.find((session) => session.status !== "canceled") ?? scoped[0]
}
