import { MedusaService } from "@medusajs/framework/utils"
import GiftCard from "./models/gift-card"

class GiftCardTrackingService extends MedusaService({ GiftCard }) {}

export default GiftCardTrackingService
