import GiftCardTrackingService from "./service"
import { Module } from "@medusajs/framework/utils"

export const GIFT_CARD_TRACKING_MODULE = "gift_card_tracking"

export default Module(GIFT_CARD_TRACKING_MODULE, {
  service: GiftCardTrackingService,
})
