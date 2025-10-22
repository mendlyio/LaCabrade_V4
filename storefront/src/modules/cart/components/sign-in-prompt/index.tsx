import { Button, Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 flex items-center justify-between">
      <div>
        <Heading level="h2" className="text-lg font-bold text-gray-900 flex items-center gap-2">
          👤 Vous avez déjà un compte ?
        </Heading>
        <Text className="text-sm text-gray-600 mt-2">
          Connectez-vous pour une meilleure expérience et un paiement plus rapide.
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button variant="secondary" className="bg-white hover:bg-gray-50 border-amber-600 text-amber-600 font-semibold py-2 px-4 rounded-lg transition-colors" data-testid="sign-in-button">
            Se connecter
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
