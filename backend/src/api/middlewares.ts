import { defineMiddlewares } from "@medusajs/medusa"
import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Middleware global des routes API.
 *
 * Pour /store/google-feed : injecte automatiquement la publishable key
 * afin que Google Merchant Center puisse récupérer le flux XML sans header.
 * La publishable key est publique (visible dans le frontend), pas de risque.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/google-feed",
      middlewares: [
        (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) => {
          if (!req.headers["x-publishable-api-key"]) {
            req.headers["x-publishable-api-key"] =
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
          }
          next()
        },
      ],
    },
  ],
})
