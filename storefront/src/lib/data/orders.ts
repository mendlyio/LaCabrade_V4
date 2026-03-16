"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { cache } from "react"
import { getAuthHeaders } from "./cookies"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const retrieveOrder = cache(async function (id: string) {
  const headers = { next: { tags: ["order"] }, ...(await getAuthHeaders()) }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { order } = await sdk.store.order.retrieve(
        id,
        attempt === 0
          ? { fields: "*payment_collections.payments" }
          : {},
        headers
      )
      if (order) return order
    } catch {
      if (attempt < 2) {
        await sleep(1000 * (attempt + 1))
        continue
      }
    }
  }

  return null
})

export const listOrders = cache(async function (
  limit: number = 10,
  offset: number = 0
) {
  return sdk.store.order
    .list({ limit, offset }, { next: { tags: ["order"] }, ...(await getAuthHeaders()) })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
})
