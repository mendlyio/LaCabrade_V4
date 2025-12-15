import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Retours & Remboursements - La Cabrade",
  description: "Politique de retour simple : 30 jours pour retourner vos articles. Retours gratuits en Belgique.",
}

export default function RetoursPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                ↩️ Retours & Échanges
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Retours faciles et gratuits
            </h1>
            <p className="text-white/90 text-lg">
              Changé d'avis ? Pas de problème ! Vous avez 30 jours pour retourner vos articles.
            </p>
          </div>
        </div>

        {/* Highlight */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-3xl">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">30 jours pour changer d'avis</h2>
              <p className="text-green-700 font-semibold">Retours GRATUITS en Belgique</p>
            </div>
          </div>
        </div>

        {/* Comment faire un retour */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Comment faire un retour ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-xl font-bold text-amber-700">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Demandez votre retour</h3>
              <p className="text-gray-600 text-sm">
                Connectez-vous à votre compte et accédez à la section "Mes commandes". Sélectionnez les articles à retourner.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-xl font-bold text-amber-700">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Préparez votre colis</h3>
              <p className="text-gray-600 text-sm">
                Emballez soigneusement vos articles avec les étiquettes d'origine. Imprimez l'étiquette de retour fournie.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-xl font-bold text-amber-700">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Envoyez votre colis</h3>
              <p className="text-gray-600 text-sm">
                Déposez votre colis au point relais indiqué. Vous serez remboursé sous 5-7 jours après réception.
              </p>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-green-600">✓</span> Articles acceptés
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">•</span>
                <span>Articles non portés et non utilisés</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">•</span>
                <span>Étiquettes d'origine attachées</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">•</span>
                <span>Emballage d'origine si possible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 flex-shrink-0">•</span>
                <span>Retour dans les 30 jours</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-red-600">✗</span> Articles exclus
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0">•</span>
                <span>Articles personnalisés ou sur mesure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0">•</span>
                <span>Sous-vêtements et articles d'hygiène</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0">•</span>
                <span>Articles soldés à -50% ou plus</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0">•</span>
                <span>Produits alimentaires et compléments</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Remboursement */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-12">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💰</span> Remboursement
          </h3>
          <p className="text-gray-600 mb-4">
            Une fois votre retour reçu et contrôlé dans notre entrepôt (sous 2-3 jours ouvrés), nous procédons au remboursement complet du montant de vos articles sous 5-7 jours ouvrés.
          </p>
          <p className="text-gray-600">
            Le remboursement est effectué sur votre moyen de paiement initial. Les frais de livraison initiaux ne sont remboursés que si le retour est dû à une erreur de notre part.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-pink-50 rounded-xl border-2 border-amber-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Besoin d'aide pour un retour ?
          </h2>
          <p className="text-gray-600 mb-6">
            Notre service client est à votre disposition pour vous accompagner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LocalizedClientLink href="/account">
              <button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
                Accéder à mes commandes
              </button>
            </LocalizedClientLink>
            <LocalizedClientLink href="/contact">
              <button className="bg-white hover:bg-gray-50 border-2 border-amber-600 text-amber-600 font-semibold py-3 px-8 rounded-lg transition-colors">
                Nous contacter
              </button>
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}

