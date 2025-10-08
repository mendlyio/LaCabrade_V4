import BpostModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const BPOST_MODULE = "bpost"

export default Module(BPOST_MODULE, {
	service: BpostModuleService,
})
