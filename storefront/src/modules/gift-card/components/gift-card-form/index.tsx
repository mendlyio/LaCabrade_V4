"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { addGiftCardToCart, GiftCardVariant } from "@lib/data/gift-card"
import GiftCardPreview from "../gift-card-preview"
import { trackGA4AddToCart, trackMetaAddToCart } from "@lib/tracking"

interface GiftCardFormProps {
  variants: GiftCardVariant[]
  countryCode: string
}

type AmountOption = "25" | "50" | "100" | "custom"

export default function GiftCardForm({ variants, countryCode }: GiftCardFormProps) {
  const router = useRouter()

  // Form state
  const [selectedAmount, setSelectedAmount] = useState<AmountOption>("50")
  const [customAmount, setCustomAmount] = useState<string>("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [message, setMessage] = useState("")

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Map amount to variant
  const getVariantForAmount = useCallback(
    (amount: AmountOption): GiftCardVariant | undefined => {
      if (amount === "custom") return undefined
      const skuMap: Record<string, string> = {
        "25": "GC-025",
        "50": "GC-050",
        "100": "GC-100",
      }
      return variants.find((v) => v.sku === skuMap[amount])
    },
    [variants]
  )

  // Get display amount
  const getDisplayAmount = useCallback((): number => {
    if (selectedAmount === "custom") {
      return Number(customAmount) || 0
    }
    return Number(selectedAmount)
  }, [selectedAmount, customAmount])

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!recipientEmail || !recipientEmail.includes("@")) {
      newErrors.email = "Veuillez entrer un email valide"
    }
    if (!recipientName.trim()) {
      newErrors.name = "Veuillez entrer le nom du destinataire"
    }
    if (message.length > 500) {
      newErrors.message = "Le message ne peut pas dépasser 500 caractères"
    }
    if (selectedAmount === "custom") {
      const amount = Number(customAmount)
      if (!amount || amount < 10) {
        newErrors.amount = "Le montant minimum est de 10€"
      } else if (amount > 500) {
        newErrors.amount = "Le montant maximum est de 500€"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [recipientEmail, recipientName, message, selectedAmount, customAmount])

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setToast(null)

    try {
      const variant = getVariantForAmount(selectedAmount)
      const isCustom = selectedAmount === "custom"
      const customAmt = isCustom ? Number(customAmount) : undefined
      // Si montant fixe mais variant non trouvé (ex: produit non seedé), fallback sur custom_amount
      const variantId = variant?.id
      const fallbackCustomAmount =
        !variantId && !isCustom && ["25", "50", "100"].includes(selectedAmount)
          ? Number(selectedAmount)
          : undefined

      const result = await addGiftCardToCart({
        variantId: variantId ?? undefined,
        customAmount: customAmt ?? fallbackCustomAmount,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        message: message.trim(),
        countryCode,
      })

      if (result.success) {
        const amount = isCustom ? Number(customAmount) : (variant?.calculated_price?.calculated_amount != null ? variant.calculated_price.calculated_amount / 100 : Number(selectedAmount))
        const item = {
          item_id: variant?.id ?? `gift-card-${amount}`,
          item_name: "Bon Cadeau",
          price: amount,
          quantity: 1,
          item_variant: `${amount}€`,
        }
        trackGA4AddToCart(item, "EUR")
        trackMetaAddToCart(item, "EUR")

        setToast({
          type: "success",
          message: "Bon cadeau ajouté au panier !",
        })
        // Reset form
        setRecipientEmail("")
        setRecipientName("")
        setMessage("")
        setCustomAmount("")
        setSelectedAmount("50")
        router.refresh()
      } else {
        setToast({
          type: "error",
          message: result.error || "Une erreur est survenue",
        })
      }
    } catch {
      setToast({
        type: "error",
        message: "Une erreur est survenue. Veuillez réessayer.",
      })
    } finally {
      setIsLoading(false)
      // Auto-dismiss toast after 5 seconds
      setTimeout(() => setToast(null), 5000)
    }
  }

  const amountOptions = [
    { value: "25" as const, label: "25€", popular: false },
    { value: "50" as const, label: "50€", popular: true },
    { value: "100" as const, label: "100€", popular: false },
    { value: "custom" as const, label: "Autre", popular: false },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Colonne gauche : Formulaire */}
      <div>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sélection du montant */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Choisissez le montant
            </label>
            <div className="grid grid-cols-4 gap-3">
              {amountOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedAmount(option.value)}
                  className={`relative px-4 py-4 rounded-xl border-2 text-center font-bold transition-all duration-200 ${
                    selectedAmount === option.value
                      ? "border-amber-600 bg-amber-50 text-amber-700 shadow-md scale-[1.02]"
                      : "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  {option.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                      POPULAIRE
                    </span>
                  )}
                  <span className="text-lg">{option.label}</span>
                </button>
              ))}
            </div>

            {/* Montant personnalisé */}
            {selectedAmount === "custom" && (
              <div className="mt-4">
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="500"
                    step="1"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value)
                      if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }))
                    }}
                    placeholder="Montant (min. 10€)"
                    className={`w-full px-4 py-3 pr-10 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors ${
                      errors.amount
                        ? "border-red-400 focus:border-red-500"
                        : "border-gray-200 focus:border-amber-500"
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                    €
                  </span>
                </div>
                {errors.amount && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.amount}</p>
                )}
              </div>
            )}
          </div>

          {/* Informations du destinataire */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Informations du destinataire
            </h3>

            {/* Nom */}
            <div>
              <label htmlFor="recipientName" className="block text-sm text-gray-600 mb-1.5">
                Nom du destinataire *
              </label>
              <input
                id="recipientName"
                type="text"
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value)
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }))
                }}
                placeholder="Ex: Marie Dupont"
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors ${
                  errors.name
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-200 focus:border-amber-500"
                }`}
              />
              {errors.name && <p className="mt-1.5 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="recipientEmail" className="block text-sm text-gray-600 mb-1.5">
                Email du destinataire *
              </label>
              <input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }))
                }}
                placeholder="Ex: marie@exemple.com"
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors ${
                  errors.email
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-200 focus:border-amber-500"
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm text-gray-600 mb-1.5">
                Message personnalisé{" "}
                <span className="text-gray-400">(optionnel)</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  if (errors.message) setErrors((prev) => ({ ...prev, message: "" }))
                }}
                placeholder="Ex: Joyeux anniversaire ! Profite bien de tes achats..."
                rows={3}
                maxLength={500}
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-0 transition-colors resize-none ${
                  errors.message
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-200 focus:border-amber-500"
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.message ? (
                  <p className="text-sm text-red-500">{errors.message}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-400">{message.length}/500</span>
              </div>
            </div>
          </div>

          {/* Bouton d'ajout au panier */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
              isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Ajout en cours...
              </span>
            ) : (
              `Ajouter au panier — ${getDisplayAmount()}€`
            )}
          </button>

          {/* Toast notification */}
          {toast && (
            <div
              className={`p-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                toast.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {toast.type === "success" ? "✓ " : "✕ "}
              {toast.message}
            </div>
          )}
        </form>
      </div>

      {/* Colonne droite : Preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <GiftCardPreview
          amount={getDisplayAmount()}
          recipientName={recipientName}
          message={message}
        />
      </div>
    </div>
  )
}
