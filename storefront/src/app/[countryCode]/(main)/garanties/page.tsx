import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Garanties - La Cabrade",
  description: "Tous nos produits sont garantis. Découvrez nos garanties fabricant et la garantie légale de conformité.",
}

export default function GarantiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                🛡️ Garanties
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Vos achats en toute confiance
            </h1>
            <p className="text-white/90 text-lg">
              Tous nos produits sont garantis. Qualité et satisfaction assurées.
            </p>
          </div>
        </div>

        {/* Garantie légale */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Garantie légale de conformité</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Conformément à la législation européenne, tous nos produits bénéficient d'une <strong>garantie légale de conformité de 2 ans</strong> à compter de la date de livraison.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Cette garantie vous couvre contre tout défaut de conformité existant au moment de la livraison du produit. Vous avez le droit de demander la réparation ou le remplacement du produit, ou à défaut, une réduction du prix ou un remboursement.
              </p>
            </div>
          </div>
        </div>

        {/* Garantie fabricant */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Garanties fabricant</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                En complément de la garantie légale, de nombreux produits bénéficient d'une <strong>garantie fabricant</strong> spécifique, dont les conditions et la durée varient selon les marques.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Exemples de garanties fabricant :</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 flex-shrink-0">•</span>
                    <span>Selles et harnachement : 1 à 5 ans selon les marques</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 flex-shrink-0">•</span>
                    <span>Couvertures : 1 à 2 ans contre les défauts de fabrication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 flex-shrink-0">•</span>
                    <span>Matériel électronique : 2 ans minimum</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Comment faire valoir sa garantie */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Comment faire valoir votre garantie ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Contactez-nous</h3>
              <p className="text-sm text-gray-600">
                Par téléphone, email ou via notre formulaire de contact. Décrivez le problème rencontré.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Envoyez le produit</h3>
              <p className="text-sm text-gray-600">
                Nous vous fournirons une étiquette de retour. Renvoyez-nous le produit avec sa facture.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Solution rapide</h3>
              <p className="text-sm text-gray-600">
                Réparation, remplacement ou remboursement selon le cas, dans les 15 jours.
              </p>
            </div>
          </div>
        </div>

        {/* Notre engagement */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Notre engagement qualité</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">✓</span>
              <div>
                <h3 className="font-semibold mb-1">Sélection rigoureuse</h3>
                <p className="text-white/90 text-sm">
                  Nous sélectionnons uniquement des marques reconnues pour leur qualité et leur fiabilité.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">✓</span>
              <div>
                <h3 className="font-semibold mb-1">Contrôle qualité</h3>
                <p className="text-white/90 text-sm">
                  Chaque produit est contrôlé avant expédition pour garantir sa conformité.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">✓</span>
              <div>
                <h3 className="font-semibold mb-1">Service après-vente</h3>
                <p className="text-white/90 text-sm">
                  Notre équipe vous accompagne tout au long de la vie de votre produit.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">✓</span>
              <div>
                <h3 className="font-semibold mb-1">Satisfaction client</h3>
                <p className="text-white/90 text-sm">
                  Votre satisfaction est notre priorité. Nous trouvons toujours une solution.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informations importantes */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>ℹ️</span> Informations importantes
          </h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 flex-shrink-0">•</span>
              <span>Conservez bien votre facture, elle vous sera demandée pour toute réclamation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 flex-shrink-0">•</span>
              <span>La garantie ne couvre pas l'usure normale ou les dommages liés à une mauvaise utilisation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 flex-shrink-0">•</span>
              <span>Pour les garanties fabricant, consultez la notice du produit pour les conditions exactes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 flex-shrink-0">•</span>
              <span>Les frais de retour pour garantie sont à notre charge</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

