import { Module } from "@medusajs/framework/utils"
import StockAlertService from "./service"

export const STOCK_ALERT_MODULE = "stock-alert"

export default Module(STOCK_ALERT_MODULE, {
  service: StockAlertService,
})
