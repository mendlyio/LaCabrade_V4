"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useFormState } from "react-dom"

import Input from "@modules/common/components/input"
import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomer } from "@lib/data/customer"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfileVat: React.FC<MyInformationProps> = ({ customer }) => {
  const [successState, setSuccessState] = useState(false)
  const [vatStatus, setVatStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const [vatMessage, setVatMessage] = useState("")
  const [vatInput, setVatInput] = useState("")

  const currentVat = (customer.metadata as any)?.vat_number || ""
  const currentCompany = (customer.metadata as any)?.company_name || ""

  useEffect(() => {
    setVatInput(currentVat)
    if (currentVat) {
      setVatStatus("valid")
    }
  }, [currentVat])

  // Valider via VIES
  const validateVat = useCallback(async (vatNumber: string) => {
    if (!vatNumber || vatNumber.length < 4) {
      setVatStatus("invalid")
      setVatMessage("Numéro de TVA trop court")
      return false
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
        setVatMessage(result.company_name ? `✓ ${result.company_name}` : "Numéro valide")
        return result
      } else {
        setVatStatus("invalid")
        setVatMessage(result.message || "Numéro de TVA invalide")
        return false
      }
    } catch {
      setVatStatus("invalid")
      setVatMessage("Erreur de validation. Réessayez.")
      return false
    }
  }, [])

  const updateCustomerVat = async (
    _currentState: Record<string, unknown>,
    formData: FormData
  ) => {
    const vatNumber = (formData.get("vat_number") as string || "").toUpperCase().replace(/[\s\-.]/g, "")
    const companyName = formData.get("company_name") as string || ""

    // Si un numéro est fourni, le valider d'abord
    if (vatNumber) {
      const validationResult = await validateVat(vatNumber)
      if (!validationResult) {
        return { success: false, error: "Le numéro de TVA n'est pas valide. Vérifiez et réessayez." }
      }

      try {
        await updateCustomer({
          metadata: {
            ...(customer.metadata || {}),
            vat_number: vatNumber,
            company_name: companyName || validationResult.company_name || "",
          },
        } as any)

        // Sauvegarder aussi dans localStorage pour le checkout
        if (typeof window !== "undefined") {
          localStorage.setItem("lc_vat_number", vatNumber)
        }

        return { success: true, error: null }
      } catch (error: any) {
        return { success: false, error: error.toString() }
      }
    } else {
      // Supprimer le numéro de TVA
      try {
        await updateCustomer({
          metadata: {
            ...(customer.metadata || {}),
            vat_number: null,
            company_name: companyName || null,
          },
        } as any)

        if (typeof window !== "undefined") {
          localStorage.removeItem("lc_vat_number")
        }

        setVatStatus("idle")
        setVatMessage("")

        return { success: true, error: null }
      } catch (error: any) {
        return { success: false, error: error.toString() }
      }
    }
  }

  const [state, formAction] = useFormState(updateCustomerVat, {
    error: false,
    success: false,
  })

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label="TVA Intracommunautaire"
        currentInfo={
          currentVat ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold font-mono">{currentVat}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                Validé
              </span>
              {currentCompany && (
                <span className="text-sm text-gray-500">({currentCompany})</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 italic">Non renseigné</span>
          )
        }
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={typeof state.error === "string" ? state.error : undefined}
        clearState={clearState}
        data-testid="account-vat-editor"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Professionnel ?</span> Ajoutez votre numéro de TVA intracommunautaire 
              pour bénéficier de l'exonération TVA sur vos commandes vers un pays UE hors Belgique.
              Le numéro sera vérifié via le système VIES de la Commission Européenne.
            </p>
          </div>

          <Input
            label="Nom de société"
            name="company_name"
            defaultValue={currentCompany}
            data-testid="company-name-input"
          />

          <div className="space-y-2">
            <Input
              label="Numéro de TVA (ex: BE0123456789)"
              name="vat_number"
              defaultValue={currentVat}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                setVatInput(val)
                if (vatStatus !== "idle") setVatStatus("idle")
                setVatMessage("")
              }}
              data-testid="vat-number-input"
            />

            {/* Bouton de pré-validation */}
            <button
              type="button"
              onClick={() => validateVat(vatInput)}
              disabled={vatStatus === "validating" || !vatInput}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
            >
              {vatStatus === "validating" ? (
                <>
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Vérification...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Pré-vérifier le numéro
                </>
              )}
            </button>

            {vatMessage && (
              <p className={`text-xs font-medium ${
                vatStatus === "valid" ? "text-emerald-600" : vatStatus === "invalid" ? "text-red-600" : "text-gray-500"
              }`}>
                {vatMessage}
              </p>
            )}
          </div>

          <p className="text-[11px] text-gray-400">
            Laissez vide pour supprimer le numéro de TVA. Le numéro sera automatiquement utilisé lors de vos prochaines commandes.
          </p>
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileVat
