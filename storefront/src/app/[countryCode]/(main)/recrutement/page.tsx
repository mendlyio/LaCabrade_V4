import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Recrutement - Rejoignez La Cabrade",
  description: "Rejoignez l'équipe La Cabrade ! Découvrez nos offres d'emploi et envoyez-nous votre candidature.",
}

export default function RecrutementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                💼 Recrutement
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Rejoignez notre équipe !
            </h1>
            <p className="text-white/90 text-lg">
              Passionné(e) d'équitation ? Envie de partager votre passion au quotidien ? Rejoignez-nous !
            </p>
          </div>
        </div>

        {/* Pourquoi nous rejoindre */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Pourquoi nous rejoindre ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏇</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Passion équestre</h3>
              <p className="text-gray-600 text-sm">
                Travaillez dans un environnement dédié à votre passion au quotidien.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Équipe conviviale</h3>
              <p className="text-gray-600 text-sm">
                Intégrez une équipe soudée et passionnée dans une ambiance familiale.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📈</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Évolution</h3>
              <p className="text-gray-600 text-sm">
                Développez vos compétences et évoluez dans un secteur en croissance.
              </p>
            </div>
          </div>
        </div>

        {/* Profils recherchés */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Les profils que nous recherchons</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-1">Vendeur/Vendeuse en sellerie</h3>
              <p className="text-gray-600 text-sm">
                Connaissance du monde équestre, sens du service client, autonomie et esprit d'équipe.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-1">Gestionnaire e-commerce</h3>
              <p className="text-gray-600 text-sm">
                Gestion des commandes en ligne, mise à jour du site, relation client digitale.
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-1">Stagiaire</h3>
              <p className="text-gray-600 text-sm">
                Nous accueillons régulièrement des stagiaires passionnés pour découvrir le métier.
              </p>
            </div>
          </div>
        </div>

        {/* Pas d'offres actuellement */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-8 mb-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Aucune offre en cours actuellement
          </h2>
          <p className="text-gray-600 mb-6">
            Nous n'avons pas de poste ouvert pour le moment, mais nous sommes toujours intéressés par les candidatures spontanées !
          </p>
          <p className="text-gray-700 font-semibold">
            Envoyez-nous votre CV et lettre de motivation, nous les conserverons précieusement.
          </p>
        </div>

        {/* Candidature spontanée */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Candidature spontanée</h2>
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Ce que nous attendons de vous :</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 flex-shrink-0">✓</span>
                  <span>Passion pour l'équitation et connaissance du matériel équestre</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 flex-shrink-0">✓</span>
                  <span>Excellent sens du service client et de l'écoute</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 flex-shrink-0">✓</span>
                  <span>Dynamisme, autonomie et esprit d'équipe</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 flex-shrink-0">✓</span>
                  <span>Maîtrise du français, néerlandais/anglais est un plus</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl p-6 text-center">
              <h4 className="text-xl font-bold mb-3">Envoyez-nous votre candidature</h4>
              <p className="mb-4 text-white/90">
                CV + Lettre de motivation par email
              </p>
              <a
                href="mailto:recrutement@lacabrade.com?subject=Candidature spontanée"
                className="inline-block bg-white text-amber-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                📧 recrutement@lacabrade.com
              </a>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Ou contactez-nous par téléphone au <strong>+32 (0)4/358.60.99</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

