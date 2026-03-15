import "server-only"
import { cookies } from "next/headers"

/** Durée de session : 30 jours (reste connecté) */
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export const getAuthHeaders = async (): Promise<{ authorization: string } | {}> => {
  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value

  if (token) {
    return { authorization: `Bearer ${token}` }
  }

  return {}
}

export const setAuthToken = async (token: string) => {
  const cookieStore = await cookies()
  cookieStore.set("_medusa_jwt", token, {
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookieStore = await cookies()
  cookieStore.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookieStore = await cookies()
  return cookieStore.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookieStore = await cookies()
  cookieStore.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookieStore = await cookies()
  cookieStore.set("_medusa_cart_id", "", { maxAge: -1 })
}

export const getAuthHeadersSafe = async (): Promise<{ authorization: string } | {}> => {
  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value

  if (token) {
    return { authorization: `Bearer ${token}` }
  }

  return {}
}

export const getCartIdSafe = async () => {
  const cookieStore = await cookies()
  return cookieStore.get("_medusa_cart_id")?.value
}

export const setCartIdSafe = async (cartId: string) => {
  const cookieStore = await cookies()
  cookieStore.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartIdSafe = async () => {
  const cookieStore = await cookies()
  cookieStore.set("_medusa_cart_id", "", { maxAge: -1 })
}

export const getCartCountSafe = async (): Promise<number> => {
  const cookieStore = await cookies()
  const count = cookieStore.get("_cart_count")?.value
  return count ? parseInt(count, 10) : 0
}

export const setCartCountSafe = async (count: number) => {
  const cookieStore = await cookies()
  cookieStore.set("_cart_count", String(Math.max(0, count)), {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}
