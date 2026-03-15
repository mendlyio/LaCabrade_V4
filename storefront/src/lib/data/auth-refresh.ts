"use server"

import { cookies } from "next/headers"
import { setAuthToken } from "./cookies"
import { revalidateTag } from "next/cache"

/**
 * Rafraîchit le token JWT pour prolonger la session.
 * À appeler quand l'utilisateur visite des pages authentifiées (ex: compte).
 * Permet de rester connecté sans se reconnecter.
 */
export async function refreshAuthToken(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value
  if (!token) return false

  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
    if (publishableKey) {
      headers["x-publishable-api-key"] = publishableKey
    }

    const res = await fetch(`${backendUrl}/store/auth/token/refresh`, {
      method: "POST",
      headers,
    })

    if (!res.ok) return false

    const data = (await res.json()) as { token?: string }
    const newToken = data?.token
    if (newToken) {
      await setAuthToken(newToken)
      revalidateTag("customer")
      revalidateTag("auth")
      return true
    }
  } catch {
    // Silencieux : ne pas bloquer l'utilisateur
  }
  return false
}
