import { model } from "@medusajs/framework/utils"

export const StockAlert = model.define("stock_alert", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  variant_id: model.text().nullable(),
  customer_email: model.text(),
  customer_id: model.text().nullable(),
  notified: model.boolean().default(false),
  created_at: model.dateTime(),
  updated_at: model.dateTime(),
})

export default StockAlert
