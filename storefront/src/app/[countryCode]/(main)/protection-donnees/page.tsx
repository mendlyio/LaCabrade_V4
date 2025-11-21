import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Protection des données personnelles | La Cabrade",
  description: "Politique de protection des données personnelles et RGPD de La Cabrade - Sellerie équestre à Fléron.",
}

export default function ProtectionDonneesPage() {
  return (
    <div className="w-full bg-white">
      <div className="content-container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Protection des données personnelles
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8">
              <p className="text-sm text-amber-800 font-medium">
                📝 Cette page est en cours de rédaction et sera complétée prochainement avec les informations détaillées sur notre politique de protection des données.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                1. Responsable du traitement
              </h2>
              <p className="text-gray-600 mb-4">
                <strong>La Cabrade - LC•EQUESTRIAN</strong><br />
                Rue de la Clef, 96<br />
                B-4620 Fléron<br />
                Belgique<br />
                Téléphone : +32 (0)4/358.60.99<br />
                Email : info@lacabrade.be
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                2. Données collectées
              </h2>
              <p className="text-gray-600 mb-4">
                Dans le cadre de notre activité de vente en ligne et de gestion de notre boutique, nous sommes amenés à collecter et traiter les données personnelles suivantes :
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Données d&apos;identification (nom, prénom, adresse email)</li>
                <li>Coordonnées (adresse postale, numéro de téléphone)</li>
                <li>Données de commande et de paiement</li>
                <li>Historique d&apos;achats</li>
                <li>Données de navigation (cookies)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                3. Finalités du traitement
              </h2>
              <p className="text-gray-600 mb-4">
                Vos données personnelles sont collectées pour les finalités suivantes :
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Gestion de vos commandes et de la relation client</li>
                <li>Traitement des paiements</li>
                <li>Livraison des produits</li>
                <li>Service après-vente et support client</li>
                <li>Envoi de newsletters (avec votre consentement)</li>
                <li>Amélioration de nos services</li>
                <li>Respect de nos obligations légales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                4. Base légale du traitement
              </h2>
              <p className="text-gray-600">
                Conformément au Règlement Général sur la Protection des Données (RGPD), le traitement de vos données repose sur :
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>L&apos;exécution du contrat de vente</li>
                <li>Votre consentement (newsletters, cookies)</li>
                <li>Le respect de nos obligations légales</li>
                <li>Notre intérêt légitime (amélioration de nos services)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                5. Durée de conservation
              </h2>
              <p className="text-gray-600">
                Vos données personnelles sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, conformément aux obligations légales en vigueur.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                6. Vos droits
              </h2>
              <p className="text-gray-600 mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Droit d&apos;accès à vos données personnelles</li>
                <li>Droit de rectification</li>
                <li>Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;)</li>
                <li>Droit à la limitation du traitement</li>
                <li>Droit à la portabilité des données</li>
                <li>Droit d&apos;opposition au traitement</li>
                <li>Droit de retirer votre consentement à tout moment</li>
                <li>Droit d&apos;introduire une réclamation auprès de l&apos;autorité de contrôle</li>
              </ul>
              <p className="text-gray-600 mt-4">
                Pour exercer vos droits, contactez-nous à l&apos;adresse : <a href="mailto:info@lacabrade.be" className="text-amber-600 hover:text-amber-700 underline">info@lacabrade.be</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                7. Sécurité des données
              </h2>
              <p className="text-gray-600">
                Nous mettons en œuvre toutes les mesures techniques et organisationnelles appropriées pour assurer la sécurité de vos données personnelles et protéger celles-ci contre toute destruction, perte, altération, divulgation ou accès non autorisés.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                8. Cookies
              </h2>
              <p className="text-gray-600">
                Notre site utilise des cookies pour améliorer votre expérience de navigation. Pour plus d&apos;informations, consultez notre <a href="/cookies" className="text-amber-600 hover:text-amber-700 underline">politique de cookies</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                9. Modifications
              </h2>
              <p className="text-gray-600">
                Nous nous réservons le droit de modifier cette politique de protection des données à tout moment. La version mise à jour sera publiée sur cette page avec la date de dernière modification.
              </p>
              <p className="text-gray-600 mt-4 text-sm italic">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}



