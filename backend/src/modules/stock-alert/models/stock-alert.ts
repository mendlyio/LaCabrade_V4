import { model } from "@medusajs/framework/utils"

const StockAlert = model.define(
  { name: "lc_stock_alert", tableName: "stock_alerts" },
  {
    id: model.id().primaryKey(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    customer_email: model.text(),
    customer_id: model.text().nullable(),
    notified: model.boolean().default(false),
  }
)

export default StockAlert
