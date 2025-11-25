"use client"

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
          className="w-full mt-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg" 
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
