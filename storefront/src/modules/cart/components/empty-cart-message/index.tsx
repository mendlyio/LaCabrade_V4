import { Heading, Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div className="py-48 px-2 flex flex-col justify-center items-center text-center" data-testid="empty-cart-message">
      <div className="mb-6 text-6xl">🛒</div>
      <Heading
        level="h1"
        className="text-3xl font-bold text-gray-900 mb-4"
      >
        Votre panier est vide
      </Heading>
      <Text className="text-base text-gray-600 mt-4 mb-8 max-w-[32rem]">
        Vous n'avez encore rien ajouté à votre panier. Découvrez notre sélection de produits équestres pour commencer vos achats.
      </Text>
      <div>
        <InteractiveLink href="/store">
          <span className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            Découvrir nos produits →
          </span>
        </InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
