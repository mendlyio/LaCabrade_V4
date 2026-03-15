import GiftCardTrackingService from "./service"
import { Module } from "@medusajs/framework/utils"
import { GIFT_CARD_TRACKING_MODULE } from "./constants"

export { GIFT_CARD_TRACKING_MODULE } from "./constants"

export default Module(GIFT_CARD_TRACKING_MODULE, {
  service: GiftCardTrackingService,
})
