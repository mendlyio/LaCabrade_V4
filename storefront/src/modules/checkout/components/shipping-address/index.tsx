import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import { useRouter } from "next/navigation"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import { useTranslate } from "@lib/context/language-context"

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  const t = useTranslate()
  const router = useRouter()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [vatNumber, setVatNumber] = useState("")
  const [vatStatus, setVatStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const [vatMessage, setVatMessage] = useState("")
  const [showVatField, setShowVatField] = useState(false)

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // check if customer has saved addresses that are in the current region
  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  useEffect(() => {
    // Ensure cart is not null and has a shipping_address before setting form data
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }

    // Restaurer le numéro de TVA — ordre de priorité :
    // 1. Depuis la metadata du cart (déjà validé pour cette commande)
    // 2. Depuis le compte client (enregistré dans le profil)
    // 3. Depuis localStorage (session précédente)
    const savedVat = (cart?.metadata as any)?.vat_number
    const customerVat = (customer?.metadata as any)?.vat_number
    const localVat = typeof window !== "undefined" ? localStorage.getItem("lc_vat_number") : null

    const vatToRestore = savedVat || customerVat || localVat

    if (vatToRestore) {
      setVatNumber(vatToRestore)
      setShowVatField(true)

      if (savedVat) {
        setVatStatus("valid")
        setVatMessage(t("checkout.vat_validated" as any))
      } else if (customerVat) {
        setVatStatus("valid")
        setVatMessage(t("checkout.vat_from_account" as any))
      } else {
        setVatStatus("valid")
        setVatMessage(t("checkout.vat_restored" as any))
      }

      // Synchroniser localStorage
      if (typeof window !== "undefined") localStorage.setItem("lc_vat_number", vatToRestore)
    }

    // Pré-remplir aussi le champ société depuis le compte client si pas déjà rempli
    if (customer?.metadata && (customer.metadata as any).company_name) {
      const companyName = (customer.metadata as any).company_name
      if (!formData["shipping_address.company"]) {
        setFormData((prev: Record<string, any>) => ({
          ...prev,
          "shipping_address.company": companyName,
        }))
      }
    }
  }, [cart, customer]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sauvegarder immédiatement le numéro validé dans cart.metadata + localStorage
  const saveVatToCart = useCallback(async (validatedVatNumber: string) => {
    // Sauvegarder dans localStorage immédiatement
    if (typeof window !== "undefined") {
      localStorage.setItem("lc_vat_number", validatedVatNumber)
    }

    // Sauvegarder aussi dans cart.metadata directement (sans attendre la soumission du formulaire)
    try {
      const { updateCart } = await import("@lib/data/cart")
      await updateCart({ metadata: { vat_number: validatedVatNumber } } as any)
      router.refresh()
    } catch (err) {
      console.warn("Impossible de sauvegarder le numéro de TVA dans le cart:", err)
    }
  }, [router])

  // Valider le numéro de TVA via VIES
  const validateVat = useCallback(async () => {
    if (!vatNumber || vatNumber.length < 4) {
      setVatStatus("invalid")
      setVatMessage(t("checkout.vat_too_short" as any))
      return
    }

    setVatStatus("validating")
    setVatMessage("")

    try {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      if (publishableKey) headers["x-publishable-api-key"] = publishableKey

      const res = await fetch(`${backendUrl}/store/custom/validate-vat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ vat_number: vatNumber }),
      })

      const result = await res.json()

      if (res.ok && result.valid) {
        setVatStatus("valid")
        if (result.vies_unavailable) {
          setVatMessage(t("checkout.vat_accepted_format" as any))
        } else {
          setVatMessage(result.company_name ? `✓ ${result.company_name}` : t("checkout.vat_validated" as any))
        }
        await saveVatToCart(vatNumber)
      } else {
        setVatStatus("invalid")
        setVatMessage(result.message || t("checkout.vat_validation_error" as any))
      }
    } catch {
      setVatStatus("invalid")
      setVatMessage(t("checkout.vat_validation_error" as any))
    }
  }, [vatNumber, saveVatToCart])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-gray-700">
            Bonjour <span className="font-semibold">{customer.first_name}</span>, {t("checkout.greeting" as any)}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}
      <div className="grid grid-cols-1 small:grid-cols-2 gap-4">
        <Input
          label={t("checkout.first_name" as any)}
          name="shipping_address.first_name"
          autoComplete="given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-first-name-input"
        />
        <Input
          label={t("checkout.last_name" as any)}
          name="shipping_address.last_name"
          autoComplete="family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-last-name-input"
        />
        <Input
          label={t("checkout.address" as any)}
          name="shipping_address.address_1"
          autoComplete="address-line1"
          value={formData["shipping_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="shipping-address-input"
        />
        <Input
          label={t("checkout.company" as any)}
          name="shipping_address.company"
          value={formData["shipping_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="shipping-company-input"
        />
        <Input
          label={t("checkout.postal_code" as any)}
          name="shipping_address.postal_code"
          autoComplete="postal-code"
          value={formData["shipping_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-postal-code-input"
        />
        <Input
          label={t("checkout.city" as any)}
          name="shipping_address.city"
          autoComplete="address-level2"
          value={formData["shipping_address.city"]}
          onChange={handleChange}
          required
          data-testid="shipping-city-input"
        />
        <CountrySelect
          name="shipping_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["shipping_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-country-select"
        />
        <Input
          label={t("checkout.province" as any)}
          name="shipping_address.province"
          autoComplete="address-level1"
          value={formData["shipping_address.province"]}
          onChange={handleChange}
          required
          data-testid="shipping-province-input"
        />
      </div>
      <div className="my-8">
        <Checkbox
          label={t("checkout.billing_same_as_shipping" as any)}
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          data-testid="billing-address-checkbox"
        />
      </div>
      <div className="grid grid-cols-1 small:grid-cols-2 gap-4 mb-4">
        <Input
          label={t("checkout.email" as any)}
          name="email"
          type="email"
          title="Enter a valid email address."
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
        <Input
          label={t("checkout.phone" as any)}
          name="shipping_address.phone"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          data-testid="shipping-phone-input"
        />
      </div>

      {/* Numéro de TVA — optionnel, pour les professionnels */}
      <div className="mb-4">
        {!showVatField ? (
          <button
            type="button"
            onClick={() => setShowVatField(true)}
            className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium transition-colors group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("checkout.add_vat" as any)}
          </button>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">{t("checkout.vat_number_label" as any)}</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setShowVatField(false)
                  setVatNumber("")
                  setVatStatus("idle")
                  setVatMessage("")
                  // Nettoyer localStorage et cart.metadata
                  if (typeof window !== "undefined") localStorage.removeItem("lc_vat_number")
                  try {
                    const { updateCart } = await import("@lib/data/cart")
                    await updateCart({ metadata: { vat_number: null } } as any)
                    router.refresh()
                  } catch {}
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fermer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  name="vat_number"
                  value={vatNumber}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                    setVatNumber(val)
                    if (vatStatus !== "idle") setVatStatus("idle")
                  }}
                  placeholder="Ex: BE0123456789"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-colors ${
                    vatStatus === "valid"
                      ? "border-emerald-300 bg-emerald-50 focus:ring-emerald-500 focus:border-emerald-500"
                      : vatStatus === "invalid"
                      ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 bg-white focus:ring-amber-500 focus:border-amber-500"
                  }`}
                  data-testid="vat-number-input"
                />
                {vatStatus === "valid" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {vatStatus === "invalid" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={validateVat}
                disabled={vatStatus === "validating" || !vatNumber}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2"
              >
                {vatStatus === "validating" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("checkout.verifying" as any)}
                  </>
                ) : (
                  t("checkout.verify" as any)
                )}
              </button>
            </div>

            {vatMessage && (
              <p className={`text-xs font-medium ${
                vatStatus === "valid" ? "text-emerald-600" : vatStatus === "invalid" ? "text-red-600" : "text-gray-500"
              }`}>
                {vatMessage}
              </p>
            )}

            {vatStatus === "valid" && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t("checkout.vat_deducted" as any)}</span>
              </div>
            )}

            <p className="text-xs text-gray-400">
              {t("checkout.vat_format" as any)}
            </p>

            {/* Champ caché pour transmettre le numéro validé au formulaire */}
            <input type="hidden" name="vat_number" value={vatStatus === "valid" ? vatNumber : ""} />
          </div>
        )}
      </div>
    </>
  )
}

export default ShippingAddress
