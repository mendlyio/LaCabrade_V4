import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Blog & Conseils - La Cabrade",
  description: "Découvrez nos articles, conseils et astuces pour l'équitation. Guides d'achat, entretien du matériel et bien plus.",
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                📝 Blog & Conseils
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Nos Conseils Équestres
            </h1>
            <p className="text-white/90 text-lg">
              Guides, astuces et actualités pour tous les passionnés d'équitation
            </p>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-6xl mb-6">🚧</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Blog en construction
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Nous travaillons actuellement sur notre blog pour vous proposer des articles de qualité, des guides d'achat détaillés et des conseils d'experts en équitation.
            </p>

            {/* Preview des futurs contenus */}
            <div className="bg-pink-50 rounded-xl border border-amber-200 p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Bientôt disponible :</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">📚</span>
                  <span className="text-gray-700">Guides d'achat complets</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">🔧</span>
                  <span className="text-gray-700">Entretien du matériel</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">🏇</span>
                  <span className="text-gray-700">Techniques équestres</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">💡</span>
                  <span className="text-gray-700">Astuces de cavaliers</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">🎯</span>
                  <span className="text-gray-700">Choix des disciplines</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">📰</span>
                  <span className="text-gray-700">Actualités équestres</span>
                </div>
              </div>
            </div>

            {/* Newsletter CTA */}
            <div className="bg-amber-600 text-white rounded-xl p-6">
              <h4 className="text-xl font-bold mb-2">Soyez informé du lancement !</h4>
              <p className="mb-4 text-white/90">
                Inscrivez-vous à notre newsletter pour être parmi les premiers à découvrir nos articles.
              </p>
              <a
                href="#newsletter"
                className="inline-block bg-white text-amber-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                M'inscrire à la newsletter
              </a>
            </div>
          </div>
        </div>

        {/* En attendant */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-6">
            En attendant, n'hésitez pas à nous contacter pour toute question ou demande de conseil !
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="tel:+3243586099"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              📞 +32 (0)4/358.60.99
            </a>
            <a
              href="/contact"
              className="inline-block bg-white hover:bg-gray-50 border-2 border-amber-600 text-amber-600 font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              💬 Nous contacter
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

