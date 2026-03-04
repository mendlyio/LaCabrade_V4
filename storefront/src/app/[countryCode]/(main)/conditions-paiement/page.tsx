import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Conditions de paiement | La Cabrade",
  description: "Conditions et moyens de paiement acceptés sur La Cabrade - Sellerie équestre à Fléron.",
}

export default function ConditionsPaiementPage() {
  return (
    <div className="w-full bg-white">
      <div className="content-container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Conditions de paiement
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8">
              <p className="text-sm text-amber-800 font-medium">
                📝 Cette page est en cours de rédaction et sera complétée prochainement avec les informations détaillées sur nos conditions de paiement.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                1. Moyens de paiement acceptés
              </h2>
              <p className="text-gray-600 mb-4">
                Nous acceptons les moyens de paiement suivants pour vos achats en ligne :
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Carte bancaire</h3>
                      <p className="text-sm text-gray-600">Visa, Mastercard, Bancontact</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">PayPal</h3>
                      <p className="text-sm text-gray-600">Paiement sécurisé via PayPal</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Virement bancaire</h3>
                      <p className="text-sm text-gray-600">Paiement par virement</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">En magasin</h3>
                      <p className="text-sm text-gray-600">Cash, carte, Bancontact</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                2. Sécurité des paiements
              </h2>
              <p className="text-gray-600 mb-4">
                Tous les paiements en ligne sont sécurisés et cryptés. Vos informations bancaires ne sont jamais stockées sur nos serveurs. Les transactions sont traitées par des prestataires de paiement certifiés PCI-DSS.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Paiement 100% sécurisé</h3>
                  <p className="text-sm text-green-800">
                    Vos données bancaires sont protégées par un cryptage SSL de dernière génération.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                3. Délais de paiement
              </h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Carte bancaire et PayPal :</strong> Paiement immédiat, commande traitée dans les plus brefs délais</li>
                <li><strong>Virement bancaire :</strong> Commande traitée dès réception du paiement (2-3 jours ouvrables)</li>
                <li><strong>En magasin :</strong> Paiement à la livraison ou au retrait</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                4. Facture
              </h2>
              <p className="text-gray-600">
                Une facture est automatiquement générée et envoyée par email après chaque commande. Vous pouvez également retrouver vos factures dans votre espace client.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                5. Litiges et remboursements
              </h2>
              <p className="text-gray-600 mb-4">
                En cas de litige concernant un paiement, veuillez nous contacter dans les plus brefs délais :
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-600">
                  <strong>Email :</strong> <a href="mailto:info@sellerie-lacabrade.be" className="text-amber-600 hover:text-amber-700 underline">info@sellerie-lacabrade.be</a><br />
                  <strong>Téléphone :</strong> <a href="tel:+3243586099" className="text-amber-600 hover:text-amber-700 underline">+32 (0)4/358.60.99</a>
                </p>
              </div>
              <p className="text-gray-600 mt-4">
                Les remboursements sont effectués selon les conditions prévues dans nos <a href="/cgv" className="text-amber-600 hover:text-amber-700 underline">Conditions Générales de Vente</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                6. Codes promotionnels
              </h2>
              <p className="text-gray-600">
                Les codes promotionnels sont applicables lors du paiement. Certaines conditions peuvent s&apos;appliquer (montant minimum d&apos;achat, validité limitée, non cumulable avec d&apos;autres offres).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                7. Contact
              </h2>
              <p className="text-gray-600">
                Pour toute question concernant nos conditions de paiement, n&apos;hésitez pas à nous contacter.
              </p>
            </section>

            <div className="bg-amber-50 rounded-lg p-6 mt-8">
              <p className="text-sm text-gray-600">
                <strong>Note :</strong> La Cabrade se réserve le droit de modifier ces conditions de paiement à tout moment. Les modifications entrent en vigueur dès leur publication sur cette page.
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



