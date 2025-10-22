import { useFormState } from "react-dom"

import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import Input from "@modules/common/components/input"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { login } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useFormState(login, null)

  return (
    <div
      className="max-w-md w-full flex flex-col items-center bg-white rounded-xl shadow-lg border border-gray-200 p-8"
      data-testid="login-page"
    >
      <div className="mb-6 text-5xl">👤</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Bon retour !</h1>
      <p className="text-center text-base text-gray-600 mb-8">
        Connectez-vous pour accéder à votre compte et profiter d'une expérience d'achat personnalisée.
      </p>
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Entrez une adresse email valide."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Mot de passe"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
          Se connecter
        </SubmitButton>
      </form>
      <span className="text-center text-gray-600 text-sm mt-6">
        Pas encore membre ?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="text-amber-600 hover:text-amber-700 font-semibold underline"
          data-testid="register-button"
        >
          Créer un compte
        </button>
      </span>
    </div>
  )
}

export default Login
