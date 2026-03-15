import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NEWSLETTER_MODULE } from "../../../modules/newsletter"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const newsletterService = req.scope.resolve(NEWSLETTER_MODULE) as any

    const { q, status, offset, limit } = req.query as {
      q?: string
      status?: string
      offset?: string
      limit?: string
    }

    const take = Math.min(parseInt(limit || "100", 10), 200)
    const skip = parseInt(offset || "0", 10)

    const filters: Record<string, any> = {}
    if (status && ["active", "unsubscribed"].includes(status)) {
      filters.status = status
    }

    const [subscribers, count] = await newsletterService.listAndCountNewsletterSubscribers(
      filters,
      { order: { created_at: "DESC" }, skip, take }
    )

    let results = subscribers
    if (q) {
      const search = q.toLowerCase()
      results = subscribers.filter((s: any) =>
        s.email.toLowerCase().includes(search)
      )
    }

    return res.json({
      subscribers: results.map((s: any) => ({
        id: s.id,
        email: s.email,
        birthday: s.birthday,
        promo_code: s.promo_code,
        birthday_promo_code: s.birthday_promo_code,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
      count: q ? results.length : count,
      offset: skip,
      limit: take,
    })
  } catch (err: any) {
    console.error("[Newsletter Admin] Erreur liste:", err.message)
    return res.status(500).json({ message: err.message })
  }
}
