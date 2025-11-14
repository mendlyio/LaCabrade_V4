import { Metadata } from "next"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Bon Cadeau | La Cabrade",
  description: "Offrez un bon cadeau La Cabrade - Le cadeau idéal pour tous les passionnés d'équitation",
}

export default function BonCadeauPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 py-20 border-b border-gray-200">
        <div className="content-container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🎁 Idée Cadeau Parfaite
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Bon Cadeau La Cabrade
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              Vous ne savez pas quoi offrir à un(e) passionné(e) d&apos;équitation ? 
              Le bon cadeau La Cabrade est LA solution idéale !
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 mb-8">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span>Valable 1 an</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span>Utilisable en ligne et en magasin</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span>Livraison par email instantanée</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Montants disponibles */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Choisissez le montant de votre bon cadeau
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bon 25€ */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-amber-200 hover:scale-105">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-white">🎁</span>
                  </div>
                  <div className="text-4xl font-bold text-amber-600 mb-2">25€</div>
                  <p className="text-sm text-gray-600 mb-6">Bon cadeau</p>
                  <LocalizedClientLink
                    href="/store?search=bon-cadeau-25"
                    className="block w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Commander
                  </LocalizedClientLink>
                </div>
              </div>

              {/* Bon 50€ */}
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-4 border-amber-400 hover:scale-110 relative">
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAIRE
                </div>
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl text-white">🏆</span>
                  </div>
                  <div className="text-5xl font-bold text-amber-600 mb-2">50€</div>
                  <p className="text-sm text-gray-600 mb-6">Bon cadeau</p>
                  <LocalizedClientLink
                    href="/store?search=bon-cadeau-50"
                    className="block w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Commander
                  </LocalizedClientLink>
                </div>
              </div>

              {/* Bon 100€ */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-amber-200 hover:scale-105">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-white">💎</span>
                  </div>
                  <div className="text-4xl font-bold text-amber-600 mb-2">100€</div>
                  <p className="text-sm text-gray-600 mb-6">Bon cadeau</p>
                  <LocalizedClientLink
                    href="/store?search=bon-cadeau-100"
                    className="block w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Commander
                  </LocalizedClientLink>
                </div>
              </div>
            </div>

            {/* Montant personnalisé */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-4">Besoin d&apos;un montant différent ?</p>
              <LocalizedClientLink
                href="/contact"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold transition-colors"
              >
                Contactez-nous pour un montant personnalisé
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 bg-gray-50">
        <div className="content-container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Comment ça marche ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-white font-bold">1</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Choisissez le montant</h3>
                <p className="text-sm text-gray-600">Sélectionnez le montant qui vous convient parmi nos offres</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-white font-bold">2</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Commandez</h3>
                <p className="text-sm text-gray-600">Passez votre commande en quelques clics</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-white font-bold">3</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Recevez par email</h3>
                <p className="text-sm text-gray-600">Recevez instantanément votre bon cadeau par email</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-white font-bold">4</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Offrez !</h3>
                <p className="text-sm text-gray-600">Imprimez ou transférez le bon cadeau à la personne de votre choix</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Pourquoi choisir le bon cadeau La Cabrade ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-xl">
                <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Choix illimité</h3>
                  <p className="text-sm text-gray-600">Plus de 5000 produits disponibles pour tous les cavaliers</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-xl">
                <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Valable 1 an</h3>
                  <p className="text-sm text-gray-600">12 mois pour utiliser le bon cadeau sans stress</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-xl">
                <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">En ligne et en magasin</h3>
                  <p className="text-sm text-gray-600">Utilisable sur notre site web et dans notre magasin à Fléron</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-xl">
                <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Livraison instantanée</h3>
                  <p className="text-sm text-gray-600">Recevez votre bon cadeau par email en quelques minutes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="content-container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à faire plaisir ?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Offrez le cadeau parfait en quelques clics
          </p>
          <LocalizedClientLink
            href="/store?search=bon-cadeau"
            className="inline-block bg-white text-amber-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-xl transition-all hover:scale-105"
          >
            Commander un bon cadeau
          </LocalizedClientLink>
        </div>
      </section>
    </div>
  )
}

