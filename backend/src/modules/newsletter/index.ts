import NewsletterModuleService from "./service"
import { Module } from "@medusajs/framework/utils"
import { NEWSLETTER_MODULE } from "./constants"

export { NEWSLETTER_MODULE } from "./constants"

export default Module(NEWSLETTER_MODULE, {
  service: NewsletterModuleService,
})
