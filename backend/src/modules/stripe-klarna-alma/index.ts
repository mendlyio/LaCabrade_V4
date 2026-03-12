import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import StripeKlarnaService from "./stripe-klarna"
import StripeAlmaService from "./stripe-alma"

export default ModuleProvider(Modules.PAYMENT, {
  services: [StripeKlarnaService, StripeAlmaService] as any,
})
