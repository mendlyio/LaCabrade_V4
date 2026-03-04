import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Conditions de livraison | La Cabrade",
  description: "Conditions de livraison, délais et tarifs pour vos commandes sur La Cabrade - Sellerie équestre à Fléron.",
}

export default function ConditionsLivraisonPage() {
  return (
    <div className="w-full bg-white">
      <div className="content-container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Conditions de livraison
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8">
              <p className="text-sm text-amber-800 font-medium">
                📝 Cette page est en cours de rédaction et sera complétée prochainement avec les informations détaillées sur nos conditions de livraison.
              </p>
            </div>

            {/* Bannière livraison gratuite */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-900 mb-1">
                    Livraison gratuite dès 75€ d&apos;achat
                  </h3>
                  <p className="text-green-800">
                    En Belgique, pour les commandes supérieures à 75€
                  </p>
                </div>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                1. Zones de livraison
              </h2>
              <p className="text-gray-600 mb-4">
                Nous livrons principalement en Belgique. D&apos;autres destinations peuvent être envisagées sur demande.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">🇧🇪 Belgique</h3>
                  <p className="text-sm text-blue-800">
                    Livraison standard : 3-5 jours ouvrables<br />
                    Gratuite dès 75€
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">🌍 International</h3>
                  <p className="text-sm text-gray-700">
                    Sur demande<br />
                    Contactez-nous pour un devis
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                2. Modes de livraison
              </h2>
              
              <div className="space-y-4">
                {/* Livraison à domicile */}
                <div className="bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-amber-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Livraison à domicile
                      </h3>
                      <p className="text-gray-600 mb-2">
                        Livraison directement à votre adresse par transporteur.
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-amber-600 font-semibold">6,90€</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">3-5 jours ouvrables</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-green-600 font-medium">Gratuit dès 75€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Point relais */}
                <div className="bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-amber-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Point relais Bpost
                      </h3>
                      <p className="text-gray-600 mb-2">
                        Retrait dans un point relais proche de chez vous.
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-amber-600 font-semibold">6,90€</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">2-4 jours ouvrables</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-green-600 font-medium">Gratuit dès 75€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retrait en magasin */}
                <div className="bg-white rounded-lg p-6 border-2 border-amber-200 hover:border-amber-400 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Retrait en magasin
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Recommandé</span>
                      </h3>
                      <p className="text-gray-600 mb-2">
                        Retirez votre commande directement à notre magasin de Fléron.
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600 font-bold text-base">GRATUIT</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">Disponible sous 24-48h</span>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        📍 Rue de la Clef, 96 - B-4620 Fléron
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                3. Délais de livraison
              </h2>
              <p className="text-gray-600 mb-4">
                Les délais de livraison sont donnés à titre indicatif et peuvent varier selon :
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>La disponibilité des produits</li>
                <li>L&apos;adresse de livraison</li>
                <li>Le mode de livraison choisi</li>
                <li>Les périodes de haute activité (fêtes, soldes)</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Vous recevrez un email de confirmation avec le numéro de suivi dès l&apos;expédition de votre commande.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                4. Suivi de commande
              </h2>
              <p className="text-gray-600 mb-4">
                Dès l&apos;expédition de votre commande, vous recevrez :
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Un email de confirmation d&apos;expédition</li>
                <li>Un numéro de suivi pour suivre votre colis en temps réel</li>
                <li>Des notifications SMS (selon le transporteur)</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Vous pouvez également suivre votre commande depuis votre <a href="/account" className="text-amber-600 hover:text-amber-700 underline">espace client</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                5. Problèmes de livraison
              </h2>
              <p className="text-gray-600 mb-4">
                En cas de problème avec votre livraison (retard, colis endommagé, erreur d&apos;adresse), contactez-nous immédiatement :
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-600">
                  <strong>Email :</strong> <a href="mailto:info@sellerie-lacabrade.be" className="text-amber-600 hover:text-amber-700 underline">info@sellerie-lacabrade.be</a><br />
                  <strong>Téléphone :</strong> <a href="tel:+3243586099" className="text-amber-600 hover:text-amber-700 underline">+32 (0)4/358.60.99</a>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                6. Livraisons spéciales
              </h2>
              <p className="text-gray-600 mb-4">
                Pour les articles volumineux ou lourds (selles, grosses commandes), des conditions spéciales peuvent s&apos;appliquer. Nous vous contacterons pour organiser la livraison.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                7. Retours et échanges
              </h2>
              <p className="text-gray-600">
                Vous disposez de 14 jours pour retourner un article qui ne vous convient pas. Les frais de retour sont à votre charge sauf en cas de produit défectueux. Pour plus d&apos;informations, consultez nos <a href="/cgv" className="text-amber-600 hover:text-amber-700 underline">Conditions Générales de Vente</a>.
              </p>
            </section>

            <div className="bg-amber-50 rounded-lg p-6 mt-8">
              <p className="text-sm text-gray-600">
                <strong>Note :</strong> La Cabrade se réserve le droit de modifier ces conditions de livraison à tout moment. Les modifications entrent en vigueur dès leur publication sur cette page.
              </p>
              <p className="text-sm text-gray-500 mt-2 italic">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



