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
    <div className="w-full" data-testid="login-page">
      <div className="mb-6 text-center">
        <div className="text-5xl mb-3">👤</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bon retour !</h2>
        <p className="text-sm text-gray-600">
          Accédez à votre compte et à vos commandes
        </p>
      </div>
      
      <form className="w-full space-y-4" action={formAction}>
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
        <div className="text-right -mt-2">
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.FORGOT_PASSWORD)}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            data-testid="forgot-password-link"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <ErrorMessage error={message} data-testid="login-error-message" />
        
        <SubmitButton 
          data-testid="sign-in-button" 
          className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          Se connecter
        </SubmitButton>
      </form>
      
      <p className="text-center text-gray-600 text-sm mt-6">
        Pas encore membre ?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="text-amber-600 hover:text-amber-700 font-semibold underline"
          data-testid="register-button"
        >
          Créer un compte
        </button>
      </p>
    </div>
  )
}

export default Login
