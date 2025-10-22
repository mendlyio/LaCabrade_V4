import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politique de Confidentialité - La Cabrade",
  description: "Politique de confidentialité et protection des données personnelles de La Cabrade.",
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container max-w-4xl">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique de Confidentialité</h1>
          
          <div className="prose max-w-none space-y-6 text-gray-600">
            {/* Introduction */}
            <section>
              <p className="text-lg">
                La Cabrade s'engage à protéger la vie privée de ses clients et utilisateurs. Cette politique de confidentialité explique comment nous collectons, utilisons, partageons et protégeons vos données personnelles.
              </p>
            </section>

            {/* Article 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Responsable du traitement</h2>
              <p>
                <strong className="text-gray-900">Responsable du traitement :</strong> La Cabrade - LC•EQUESTRIAN<br />
                <strong className="text-gray-900">Adresse :</strong> Rue de la Clef, 96 - B-4620 Fléron, Belgique<br />
                <strong className="text-gray-900">Email :</strong> contact@lacabrade.com<br />
                <strong className="text-gray-900">Téléphone :</strong> +32 (0)4/358.60.99
              </p>
            </section>

            {/* Article 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Données collectées</h2>
              <p className="mb-3">Nous collectons les données suivantes :</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Données d'identification</h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Adresse postale</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Données de commande</h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Historique des commandes</li>
                <li>Produits achetés</li>
                <li>Montants des transactions</li>
                <li>Adresse de livraison</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Données de navigation</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Adresse IP</li>
                <li>Type de navigateur</li>
                <li>Pages visitées</li>
                <li>Durée de visite</li>
              </ul>
            </section>

            {/* Article 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Finalités du traitement</h2>
              <p className="mb-3">Vos données sont collectées et traitées pour les finalités suivantes :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Traitement et livraison de vos commandes</li>
                <li>Gestion de la relation client et du service après-vente</li>
                <li>Envoi de communications marketing (avec votre consentement)</li>
                <li>Amélioration de nos services et de votre expérience utilisateur</li>
                <li>Prévention de la fraude et sécurisation des paiements</li>
                <li>Respect de nos obligations légales et réglementaires</li>
              </ul>
            </section>

            {/* Article 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Base légale du traitement</h2>
              <p className="mb-3">Le traitement de vos données repose sur :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>L'exécution du contrat</strong> pour le traitement de vos commandes</li>
                <li><strong>Votre consentement</strong> pour les communications marketing</li>
                <li><strong>Notre intérêt légitime</strong> pour l'amélioration de nos services</li>
                <li><strong>Nos obligations légales</strong> en matière comptable et fiscale</li>
              </ul>
            </section>

            {/* Article 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Destinataires des données</h2>
              <p className="mb-3">Vos données personnelles peuvent être transmises à :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nos prestataires de services (hébergement, paiement, livraison)</li>
                <li>Nos partenaires logistiques pour la livraison de vos commandes</li>
                <li>Les autorités compétentes en cas d'obligation légale</li>
              </ul>
              <p className="mt-3">
                Nous nous assurons que tous nos partenaires respectent le RGPD et protègent vos données avec le même niveau de sécurité.
              </p>
            </section>

            {/* Article 6 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Durée de conservation</h2>
              <p className="mb-3">Vos données sont conservées pendant les durées suivantes :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Données de compte :</strong> Jusqu'à la suppression de votre compte ou 3 ans après votre dernière activité</li>
                <li><strong>Données de commande :</strong> 10 ans pour respecter nos obligations comptables</li>
                <li><strong>Données marketing :</strong> 3 ans après votre dernier contact ou jusqu'au retrait de votre consentement</li>
                <li><strong>Cookies :</strong> 13 mois maximum</li>
              </ul>
            </section>

            {/* Article 7 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Vos droits</h2>
              <p className="mb-3">Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données</li>
                <li><strong>Droit de rectification :</strong> Corriger vos données inexactes</li>
                <li><strong>Droit à l'effacement :</strong> Supprimer vos données (sous conditions)</li>
                <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
                <li><strong>Droit à la limitation :</strong> Limiter le traitement de vos données</li>
                <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré</li>
                <li><strong>Droit de retirer votre consentement :</strong> À tout moment pour les traitements basés sur votre consentement</li>
              </ul>
              <p>
                Pour exercer vos droits, contactez-nous à <a href="mailto:contact@lacabrade.com" className="text-amber-600 hover:text-amber-700 underline">contact@lacabrade.com</a> ou par courrier à l'adresse indiquée ci-dessus.
              </p>
            </section>

            {/* Article 8 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Sécurité des données</h2>
              <p>
                Nous mettons en œuvre toutes les mesures techniques et organisationnelles appropriées pour garantir la sécurité de vos données personnelles et les protéger contre toute destruction, perte, altération, divulgation ou accès non autorisé.
              </p>
              <p className="mt-3">
                Les paiements sont sécurisés par notre prestataire Stripe et ne transitent jamais par nos serveurs.
              </p>
            </section>

            {/* Article 9 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies</h2>
              <p>
                Notre site utilise des cookies pour améliorer votre expérience de navigation. Pour plus d'informations, consultez notre <a href="/cookies" className="text-amber-600 hover:text-amber-700 underline">Politique relative aux Cookies</a>.
              </p>
            </section>

            {/* Article 10 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Modifications</h2>
              <p>
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. La version en vigueur est celle publiée sur notre site. Nous vous informerons de toute modification substantielle.
              </p>
            </section>

            {/* Article 11 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Réclamation</h2>
              <p>
                Si vous estimez que le traitement de vos données porte atteinte à vos droits, vous pouvez introduire une réclamation auprès de l'Autorité de protection des données belge (APD) :
              </p>
              <p className="mt-3">
                <strong className="text-gray-900">Autorité de protection des données</strong><br />
                Rue de la Presse, 35<br />
                1000 Bruxelles<br />
                Email : <a href="mailto:contact@apd-gba.be" className="text-amber-600 hover:text-amber-700 underline">contact@apd-gba.be</a><br />
                Site web : <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline">www.autoriteprotectiondonnees.be</a>
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

