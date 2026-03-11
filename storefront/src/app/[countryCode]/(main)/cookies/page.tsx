import { Metadata } from "next"
import ManageCookiesLink from "@modules/layout/components/manage-cookies-link"

export const metadata: Metadata = {
  title: "Politique relative aux Cookies - La Cabrade",
  description: "Informations sur l'utilisation des cookies sur le site La Cabrade.",
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container max-w-4xl">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique relative aux Cookies</h1>
          
          <div className="prose max-w-none space-y-6 text-gray-600">
            {/* Introduction */}
            <section>
              <p className="text-lg">
                Notre site (sellerie-lacabrade.be) utilise des cookies pour améliorer votre expérience de navigation et analyser l'utilisation de notre site. Cette politique vous explique ce que sont les cookies, comment nous les utilisons et comment vous pouvez les gérer.
              </p>
            </section>

            {/* Qu'est-ce qu'un cookie */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Qu'est-ce qu'un cookie ?</h2>
              <p>
                Un cookie est un petit fichier texte déposé sur votre ordinateur, tablette ou smartphone lors de la visite d'un site web. Les cookies permettent au site de reconnaître votre appareil et de mémoriser certaines informations sur vos préférences ou actions.
              </p>
              <p className="mt-3">
                Les cookies ne contiennent pas de virus et ne peuvent pas accéder aux informations stockées sur votre ordinateur.
              </p>
            </section>

            {/* Types de cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Types de cookies que nous utilisons</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Cookies strictement nécessaires</h3>
              <p className="mb-4">
                Ces cookies sont essentiels au fonctionnement du site. Ils vous permettent de naviguer sur le site et d'utiliser ses fonctionnalités (panier d'achat, connexion à votre compte, etc.). Sans ces cookies, certains services ne peuvent pas être fournis.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Exemples :</strong> Session utilisateur, panier d'achat, authentification, sécurité
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Cookies de performance</h3>
              <p className="mb-4">
                Ces cookies collectent des informations sur la façon dont les visiteurs utilisent notre site (pages visitées, durée de visite, etc.). Ces données nous aident à améliorer le fonctionnement de notre site.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Exemples :</strong> Google Analytics, statistiques de visite
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Cookies de fonctionnalité</h3>
              <p className="mb-4">
                Ces cookies permettent au site de mémoriser vos choix (langue, région, préférences) pour vous offrir une expérience plus personnalisée.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Exemples :</strong> Préférences linguistiques, région sélectionnée
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.4 Cookies publicitaires</h3>
              <p>
                Ces cookies permettent de vous proposer des publicités adaptées à vos intérêts. Ils peuvent être placés par nos partenaires publicitaires.
              </p>
            </section>

            {/* Durée de conservation */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Durée de conservation des cookies</h2>
              <p className="mb-3">Les cookies que nous utilisons ont différentes durées de vie :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Cookies de session :</strong> Supprimés dès que vous fermez votre navigateur</li>
                <li><strong>Cookies persistants :</strong> Conservés jusqu'à 13 mois maximum</li>
              </ul>
            </section>

            {/* Liste des cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Liste des cookies utilisés</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cookie</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Durée</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    <tr>
                      <td className="px-4 py-3">_medusa_session</td>
                      <td className="px-4 py-3">Nécessaire</td>
                      <td className="px-4 py-3">Session</td>
                      <td className="px-4 py-3">Gestion de session utilisateur</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">cart_id</td>
                      <td className="px-4 py-3">Nécessaire</td>
                      <td className="px-4 py-3">7 jours</td>
                      <td className="px-4 py-3">Mémorisation du panier d'achat</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">country_code</td>
                      <td className="px-4 py-3">Fonctionnel</td>
                      <td className="px-4 py-3">30 jours</td>
                      <td className="px-4 py-3">Mémorisation du pays/langue</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">cookie_consent</td>
                      <td className="px-4 py-3">Fonctionnel</td>
                      <td className="px-4 py-3">365 jours</td>
                      <td className="px-4 py-3">Mémorisation de votre choix de consentement aux cookies</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">_ga</td>
                      <td className="px-4 py-3">Performance</td>
                      <td className="px-4 py-3">13 mois</td>
                      <td className="px-4 py-3">Google Analytics - statistiques (si accepté)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Gestion des cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Comment gérer les cookies ?</h2>
              <p className="mb-4">
                Vous pouvez à tout moment choisir de désactiver les cookies. Votre navigateur peut également être paramétré pour vous signaler les cookies déposés et vous demander de les accepter ou non.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Configuration par navigateur :</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Google Chrome :</strong> Paramètres {'>'} Confidentialité et sécurité {'>'} Cookies</li>
                <li><strong>Firefox :</strong> Options {'>'} Vie privée et sécurité {'>'} Cookies et données de sites</li>
                <li><strong>Safari :</strong> Préférences {'>'} Confidentialité</li>
                <li><strong>Edge :</strong> Paramètres {'>'} Cookies et autorisations de site</li>
              </ul>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                <p className="text-sm text-gray-700">
                  <strong>⚠️ Attention :</strong> La désactivation des cookies peut affecter le bon fonctionnement du site et limiter votre expérience utilisateur (impossibilité d'ajouter des articles au panier, de vous connecter, etc.).
                </p>
              </div>
            </section>

            {/* Cookies tiers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies tiers</h2>
              <p className="mb-3">
                Certains cookies sont déposés par des services tiers (Google Analytics, réseaux sociaux, solutions de paiement). Ces tiers peuvent utiliser ces cookies pour :
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Analyser le trafic sur notre site</li>
                <li>Personnaliser les publicités que vous voyez sur d'autres sites</li>
                <li>Vous permettre de partager du contenu sur les réseaux sociaux</li>
              </ul>
              <p>
                Nous n'avons pas de contrôle sur ces cookies tiers. Nous vous recommandons de consulter les politiques de confidentialité de ces services pour comprendre comment ils utilisent vos données.
              </p>
            </section>

            {/* Consentement */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Votre consentement</h2>
              <p>
                Lors de votre première visite sur notre site, un bandeau vous informe de la présence de cookies et vous demande votre consentement pour les cookies non essentiels. Vous pouvez à tout moment modifier vos préférences en cliquant sur le lien <ManageCookiesLink className="text-amber-600 hover:text-amber-700 underline font-medium">Gérer mes cookies</ManageCookiesLink> en bas de page.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact</h2>
              <p>
                Pour toute question concernant notre utilisation des cookies, vous pouvez nous contacter à :
              </p>
              <p className="mt-3">
                <strong className="text-gray-900">Email :</strong> <a href="mailto:contact@sellerie-lacabrade.be" className="text-amber-600 hover:text-amber-700 underline">contact@sellerie-lacabrade.be</a><br />
                <strong className="text-gray-900">Téléphone :</strong> +32 (0)4/358.60.99
              </p>
            </section>
          </div>

          {/* Date de mise à jour */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

