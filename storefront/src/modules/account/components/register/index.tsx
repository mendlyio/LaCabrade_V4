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
    <div
      className="max-w-md flex flex-col items-center bg-white rounded-xl shadow-lg border border-gray-200 p-8"
      data-testid="register-page"
    >
      <div className="mb-6 text-5xl">✨</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Créer un compte
      </h1>
      <p className="text-center text-base text-gray-600 mb-6">
        Rejoignez La Cabrade et profitez d'avantages exclusifs : commandes rapides, suivi de vos achats et plus encore.
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-4">
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
        </div>
        <ErrorMessage error={message} data-testid="register-error" />
        <span className="text-center text-gray-600 text-xs mt-6">
          En créant un compte, vous acceptez notre{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="text-amber-600 hover:text-amber-700 underline"
          >
            Politique de Confidentialité
          </LocalizedClientLink>{" "}
          et nos{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="text-amber-600 hover:text-amber-700 underline"
          >
            Conditions d'Utilisation
          </LocalizedClientLink>
          .
        </span>
        <SubmitButton className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors" data-testid="register-button">
          Créer mon compte
        </SubmitButton>
      </form>
      <span className="text-center text-gray-600 text-sm mt-6">
        Déjà membre ?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="text-amber-600 hover:text-amber-700 font-semibold underline"
        >
          Se connecter
        </button>
      </span>
    </div>
  )
}

export default Register
