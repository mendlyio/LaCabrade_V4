import { model } from "@medusajs/framework/utils"

const NewsletterSubscriber = model.define(
  { name: "lc_newsletter_subscriber", tableName: "newsletter_subscribers" },
  {
    id: model.id().primaryKey(),
    email: model.text().unique(),
    birthday: model.text().nullable(),
    promo_code: model.text().nullable(),
    birthday_promo_code: model.text().nullable(),
    status: model.enum(["active", "unsubscribed"]).default("active"),
  }
)

export default NewsletterSubscriber
