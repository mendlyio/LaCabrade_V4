import { Metadata } from "next"
import { getRegion } from "@lib/data/regions"
import { getGiftCardProduct } from "@lib/data/gift-card"
import GiftCardForm from "@modules/gift-card/components/gift-card-form"

export const metadata: Metadata = {
  title: "Bon Cadeau | La Cabrade",
  description:
    "Offrez un bon cadeau La Cabrade - Le cadeau idéal pour tous les passionnés d'équitation. Valable 1 an, utilisable en ligne et en magasin.",
}

type Props = {
  params: { countryCode: string }
}

export default async function BonCadeauPage({ params }: Props) {
  const { countryCode } = params
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const giftCardProduct = await getGiftCardProduct(region.id)

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-amber-50/60 via-white to-white py-16 sm:py-20 border-b border-gray-100">
        <div className="content-container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-5">
              Idée Cadeau Parfaite
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
              Offrez un Bon Cadeau
              <span className="text-amber-600"> La Cabrade</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Vous ne savez pas quoi offrir à un(e) passionné(e) d&apos;équitation ?
              Le bon cadeau est LA solution idéale ! Utilisable sur plus de 5000
              produits, en ligne et en magasin.
            </p>
          </div>
        </div>
      </section>

      {/* Formulaire & Preview */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="content-container">
          <div className="max-w-5xl mx-auto">
            {giftCardProduct ? (
              <GiftCardForm
                variants={giftCardProduct.variants}
                countryCode={countryCode}
              />
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Bons cadeaux bientôt disponibles
                </h3>
                <p className="text-gray-500">
                  Les bons cadeaux seront disponibles très prochainement. Restez
                  connecté(e) !
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="content-container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
              Comment ça marche ?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                {
                  step: "1",
                  title: "Choisissez",
                  description:
                    "Sélectionnez le montant du bon cadeau parmi nos offres ou définissez un montant personnalisé",
                },
                {
                  step: "2",
                  title: "Personnalisez",
                  description:
                    "Ajoutez le nom du destinataire et un message personnalisé pour rendre votre cadeau unique",
                },
                {
                  step: "3",
                  title: "Commandez",
                  description:
                    "Ajoutez le bon cadeau à votre panier et finalisez votre commande",
                },
                {
                  step: "4",
                  title: "Offrez !",
                  description:
                    "Le destinataire reçoit instantanément son bon cadeau par email avec un joli PDF",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl text-white font-bold">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
              Pourquoi choisir le bon cadeau La Cabrade ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  ),
                  title: "Choix illimité",
                  description:
                    "Plus de 5000 produits disponibles pour tous les cavaliers et cavalières",
                },
                {
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ),
                  title: "Valable 1 an",
                  description:
                    "12 mois pour utiliser le bon cadeau, sans stress ni pression",
                },
                {
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  ),
                  title: "En ligne et en magasin",
                  description:
                    "Utilisable sur lacabrade.be et dans notre magasin à Fléron",
                },
                {
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  ),
                  title: "Livraison instantanée",
                  description:
                    "Le destinataire reçoit son bon cadeau par email en quelques minutes",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-5 bg-amber-50/60 rounded-xl hover:bg-amber-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
