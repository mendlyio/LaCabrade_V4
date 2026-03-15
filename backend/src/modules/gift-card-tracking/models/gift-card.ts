import { model } from "@medusajs/framework/utils"

const GiftCard = model.define("gift_card_tracking", {
  id: model.id().primaryKey(),
  code: model.text().unique(),
  original_amount: model.bigNumber(),
  balance: model.bigNumber(),
  recipient_email: model.text(),
  recipient_name: model.text(),
  sender_name: model.text().nullable(),
  message: model.text().nullable(),
  order_id: model.text(),
  promotion_id: model.text().nullable(),
  status: model.enum(["active", "depleted", "disabled"]).default("active"),
})

export default GiftCard
