import type { MiddlewaresConfig } from "@medusajs/medusa"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import rateLimit from "express-rate-limit"

function getClientIp(req: any): string {
  const forwarded = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
  return forwarded || req.socket?.remoteAddress || "unknown"
}

const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { ip: false },
  handler: (_req: MedusaRequest, res: MedusaResponse) => {
    res.status(429).json({
      message: "Trop de tentatives. Veuillez réessayer dans 15 minutes.",
    })
  },
  skip: (req: MedusaRequest) => {
    const body = req.body as Record<string, unknown>
    return !!body?.website
  },
})

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { ip: false },
  handler: (_req: MedusaRequest, res: MedusaResponse) => {
    res.status(429).json({
      message: "Trop de messages envoyés. Veuillez réessayer dans 1 heure.",
    })
  },
  skip: (req: MedusaRequest) => {
    const body = req.body as Record<string, unknown>
    return !!body?.website
  },
})

export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: "/store/newsletter",
      middlewares: [newsletterLimiter as unknown as (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => void],
    },
    {
      matcher: "/store/contact",
      middlewares: [contactLimiter as unknown as (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => void],
    },
  ],
}
