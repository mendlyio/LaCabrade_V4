export default function ProductTrustBadges() {
  const badges = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Paiement sécurisé",
      description: "SSL & cryptage"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      title: "Livraison gratuite",
      description: "Dès 100€ d'achat"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      title: "Retours gratuits",
      description: "30 jours"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "Support 7j/7",
      description: "À votre service"
    },
  ]

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Pourquoi nous choisir ?</h3>
      <div className="grid grid-cols-2 gap-3">
        {badges.map((badge, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-gradient-to-br bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-600 shadow-sm">
              {badge.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm">{badge.title}</div>
              <div className="text-xs text-gray-600">{badge.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

