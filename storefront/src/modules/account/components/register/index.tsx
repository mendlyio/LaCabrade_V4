"use client"

import { useState } from "react"
import { useFormState } from "react-dom"

import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useFormState(signup, null)
  const [showProFields, setShowProFields] = useState(false)

  return (
    <div className="w-full" data-testid="register-page">
      <div className="mb-6 text-center">
        <div className="text-5xl mb-3">✨</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Créer un compte
        </h2>
        <p className="text-sm text-gray-600">
          Rejoignez-nous et profitez d'avantages exclusifs
        </p>
      </div>
      
      <form className="w-full space-y-4" action={formAction}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Prénom"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="Nom"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
        </div>
        
        <Input
          label="Email"
          name="email"
          required
          type="email"
          autoComplete="email"
          data-testid="email-input"
        />
        
        <Input
          label="Téléphone"
          name="phone"
          type="tel"
          autoComplete="tel"
          data-testid="phone-input"
        />
        
        <Input
          label="Mot de passe"
          name="password"
          required
          type="password"
          autoComplete="new-password"
          data-testid="password-input"
        />

        {/* Section Professionnel — optionnelle */}
        <div className="pt-2">
          {!showProFields ? (
            <button
              type="button"
              onClick={() => setShowProFields(true)}
              className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium transition-colors group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Vous êtes professionnel ? Ajoutez votre TVA
            </button>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Informations professionnelles
                </span>
                <button
                  type="button"
                  onClick={() => setShowProFields(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Input
                label="Nom de société"
                name="company_name"
                autoComplete="organization"
                data-testid="company-name-input"
              />
              <Input
                label="Numéro de TVA (ex: BE0123456789)"
                name="vat_number"
                data-testid="vat-number-input"
              />
              <p className="text-[11px] text-gray-400">
                Optionnel — sera vérifié via VIES lors de vos commandes. Vous pourrez aussi l'ajouter plus tard dans votre profil.
              </p>
            </div>
          )}
        </div>
        
        <ErrorMessage error={message} data-testid="register-error" />
        
        <p className="text-center text-gray-600 text-xs mt-4">
          En créant un compte, vous acceptez nos{" "}
          <LocalizedClientLink
            href="/cgv"
            className="text-amber-600 hover:text-amber-700 underline"
          >
            CGV
          </LocalizedClientLink>{" "}
          et notre{" "}
          <LocalizedClientLink
            href="/protection-donnees"
            className="text-amber-600 hover:text-amber-700 underline"
          >
            Politique de Confidentialité
          </LocalizedClientLink>
          .
        </p>
        
        <SubmitButton 
          className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg" 
          data-testid="register-button"
        >
          Créer mon compte
        </SubmitButton>
      </form>
      
      <p className="text-center text-gray-600 text-sm mt-6">
        Déjà membre ?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="text-amber-600 hover:text-amber-700 font-semibold underline"
        >
          Se connecter
        </button>
      </p>
    </div>
  )
}

export default Register
