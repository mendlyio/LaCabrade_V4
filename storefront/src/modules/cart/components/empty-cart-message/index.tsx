import { Heading, Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 py-16 px-6 flex flex-col justify-center items-center text-center" data-testid="empty-cart-message">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <Heading
        level="h1"
        className="text-xl font-bold text-gray-900 mb-2"
      >
        Votre panier est vide
      </Heading>
      <Text className="text-sm text-gray-500 mb-8 max-w-sm">
        Vous n'avez encore rien ajouté. Parcourez notre sélection de produits équestres.
      </Text>
      <InteractiveLink href="/store">
        <span className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-sm">
          Voir les produits
        </span>
      </InteractiveLink>
    </div>
  )
}

export default EmptyCartMessage
