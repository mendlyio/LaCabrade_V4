"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { cache } from "react"
import { getAuthHeaders, removeAuthToken, setAuthToken } from "./cookies"

export const getCustomer = cache(async function () {
  return await sdk.store.customer
    .retrieve({}, { next: { tags: ["customer"] }, ...getAuthHeaders() })
    .then(({ customer }) => customer)
    .catch(() => null)
})

export const updateCustomer = cache(async function (
  body: HttpTypes.StoreUpdateCustomer
) {
  const updateRes = await sdk.store.customer
    .update(body, {}, getAuthHeaders())
    .then(({ customer }) => customer)
    .catch(medusaError)

  revalidateTag("customer")
  return updateRes
})

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const vatNumber = (formData.get("vat_number") as string || "").toUpperCase().replace(/[\s\-.]/g, "")
  const companyName = formData.get("company_name") as string || ""

  const customerForm: any = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  // Si un numéro de TVA est fourni, le valider via VIES avant de l'enregistrer
  let validatedVat = ""
  let validatedCompanyName = companyName

  if (vatNumber) {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
      const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (publishableKey) headers["x-publishable-api-key"] = publishableKey

      const viesRes = await fetch(`${backendUrl}/store/custom/validate-vat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ vat_number: vatNumber }),
      })

      const viesData = await viesRes.json()

      if (viesRes.ok && viesData.valid) {
        validatedVat = vatNumber
        // Utiliser le nom de société retourné par VIES si pas déjà renseigné
        if (!validatedCompanyName && viesData.company_name) {
          validatedCompanyName = viesData.company_name
        }
      } else {
        return `Numéro de TVA invalide : ${viesData.message || "vérifiez le format et réessayez"}`
      }
    } catch {
      return "Impossible de vérifier le numéro de TVA. Réessayez ou laissez le champ vide."
    }
  }

  // Ajouter les infos professionnelles si fournies et validées
  if (validatedVat || validatedCompanyName) {
    customerForm.metadata = {
      ...(validatedVat ? { vat_number: validatedVat } : {}),
      ...(validatedCompanyName ? { company_name: validatedCompanyName } : {}),
    }
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    const customHeaders = { authorization: `Bearer ${token}` }
    
    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      customHeaders
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    setAuthToken(typeof loginToken === 'string' ? loginToken : loginToken.location)

    revalidateTag("customer")
    return createdCustomer
  } catch (error: any) {
    return error.toString()
  }
}

export async function requestPasswordReset(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  if (!email?.trim()) return "Veuillez entrer votre adresse email."

  try {
    await sdk.auth.resetPassword("customer", "emailpass", {
      identifier: email.trim(),
    })
    return "success"
  } catch (error: any) {
    return error?.message ?? "Une erreur est survenue. Réessayez."
  }
}

export async function resetPasswordWithToken(
  token: string,
  email: string,
  newPassword: string
) {
  try {
    await sdk.auth.updateProvider(
      "customer",
      "emailpass",
      { email, password: newPassword },
      token
    )
    return null
  } catch (error: any) {
    return error?.message ?? "Le lien a peut-être expiré. Demandez une nouvelle réinitialisation."
  }
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then((token) => {
        setAuthToken(typeof token === 'string' ? token : token.location)
        revalidateTag("customer")
      })
  } catch (error: any) {
    return error.toString()
  }
}

export async function signout(countryCode: string) {
  await sdk.auth.logout()
  removeAuthToken()
  revalidateTag("auth")
  revalidateTag("customer")
  redirect(`/${countryCode}/account`)
}

export const addCustomerAddress = async (
  _currentState: unknown,
  formData: FormData
): Promise<any> => {
  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
  }

  return sdk.store.customer
    .createAddress(address, {}, getAuthHeaders())
    .then(({ customer }) => {
      revalidateTag("customer")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  await sdk.store.customer
    .deleteAddress(addressId, getAuthHeaders())
    .then(() => {
      revalidateTag("customer")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId = currentState.addressId as string

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, getAuthHeaders())
    .then(() => {
      revalidateTag("customer")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
