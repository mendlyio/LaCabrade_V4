import StockAlertModuleService from "./service"
import { Module } from "@medusajs/framework/utils"
import { STOCK_ALERT_MODULE } from "./constants"

export { STOCK_ALERT_MODULE } from "./constants"

export default Module(STOCK_ALERT_MODULE, {
  service: StockAlertModuleService,
})
