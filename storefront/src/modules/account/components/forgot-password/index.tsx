"use client"

import { useFormState } from "react-dom"
import Input from "@modules/common/components/input"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { requestPasswordReset } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const ForgotPassword = ({ setCurrentView }: Props) => {
  const [message, formAction] = useFormState(requestPasswordReset, null)
  const success = message === "success"

  if (success) {
    return (
      <div className="w-full text-center py-4" data-testid="forgot-password-success">
        <div className="text-5xl mb-3">✉️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Email envoyé</h2>
        <p className="text-sm text-gray-600 mb-6">
          Si un compte existe avec cette adresse email, vous recevrez un lien pour réinitialiser votre mot de passe.
        </p>
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="text-amber-600 hover:text-amber-700 font-semibold underline"
        >
          Retour à la connexion
        </button>
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="forgot-password-form">
      <div className="mb-6 text-center">
        <div className="text-5xl mb-3">🔑</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié ?</h2>
        <p className="text-sm text-gray-600">
          Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>

      <form className="w-full space-y-4" action={formAction}>
        <Input
          label="Email"
          name="email"
          type="email"
          title="Entrez votre adresse email."
          autoComplete="email"
          required
          data-testid="forgot-password-email-input"
        />

        <ErrorMessage error={typeof message === "string" && message !== "success" ? message : null} />

        <SubmitButton
          data-testid="forgot-password-submit"
          className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg"
        >
          Envoyer le lien
        </SubmitButton>
      </form>

      <p className="text-center text-gray-600 text-sm mt-6">
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="text-amber-600 hover:text-amber-700 font-semibold underline"
        >
          ← Retour à la connexion
        </button>
      </p>
    </div>
  )
}

export default ForgotPassword
