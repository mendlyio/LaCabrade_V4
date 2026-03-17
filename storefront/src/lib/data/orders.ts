"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { cache } from "react"
import { getAuthHeaders, getAuthHeadersSafe } from "./cookies"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const ORDER_RETRIEVE_ATTEMPTS = 5
const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

export const retrieveOrder = cache(async function (id: string) {
  const headers = { next: { tags: ["order"] }, ...(await getAuthHeaders()) }

  for (let attempt = 0; attempt < ORDER_RETRIEVE_ATTEMPTS; attempt++) {
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
      if (attempt < ORDER_RETRIEVE_ATTEMPTS - 1) {
        await sleep(1000 * (attempt + 1))
        continue
      }
    }
  }

  return null
})

export async function retrieveOrderByCartId(cartId: string) {
  if (!cartId) {
    return null
  }

  const headers: Record<string, string> = {}
  const authHeaders = await getAuthHeadersSafe()
  if (authHeaders) {
    Object.assign(headers, authHeaders)
  }
  if (PUBLISHABLE_API_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_API_KEY
  }

  for (let attempt = 0; attempt < ORDER_RETRIEVE_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(
        `${MEDUSA_BACKEND_URL}/store/custom/orders/by-cart/${cartId}`,
        {
          headers,
          cache: "no-store",
        }
      )

      if (response.status === 404) {
        if (attempt < ORDER_RETRIEVE_ATTEMPTS - 1) {
          await sleep(1000 * (attempt + 1))
          continue
        }

        return null
      }

      if (!response.ok) {
        throw new Error(`Erreur récupération commande: ${response.status}`)
      }

      const payload = await response.json()
      return payload?.order ?? null
    } catch {
      if (attempt < ORDER_RETRIEVE_ATTEMPTS - 1) {
        await sleep(1000 * (attempt + 1))
        continue
      }
    }
  }

  return null
}

export const listOrders = cache(async function (
  limit: number = 10,
  offset: number = 0
) {
  return sdk.store.order
    .list({ limit, offset }, { next: { tags: ["order"] }, ...(await getAuthHeaders()) })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
})
