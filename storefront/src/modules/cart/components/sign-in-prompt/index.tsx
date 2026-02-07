import { Button, Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
      <div>
        <Heading level="h2" className="text-sm font-semibold text-gray-900">
          Vous avez un compte ?
        </Heading>
        <Text className="text-xs text-gray-500 mt-1">
          Connectez-vous pour un paiement plus rapide.
        </Text>
      </div>
      <LocalizedClientLink href="/account">
        <Button
          variant="secondary"
          className="text-xs font-semibold text-amber-600 border border-amber-600 hover:bg-amber-50 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          data-testid="sign-in-button"
        >
          Se connecter
        </Button>
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
