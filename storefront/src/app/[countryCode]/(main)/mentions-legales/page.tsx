import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mentions légales - La Cabrade",
  description: "Mentions légales du site La Cabrade - Informations sur l'éditeur et l'hébergeur.",
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container max-w-4xl">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions légales</h1>
          
          <div className="prose max-w-none space-y-6 text-gray-600">
            {/* Éditeur */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Éditeur du site</h2>
              <p className="mb-2"><strong className="text-gray-900">Raison sociale :</strong> La Cabrade - LC•EQUESTRIAN</p>
              <p className="mb-2"><strong className="text-gray-900">Forme juridique :</strong> [À compléter]</p>
              <p className="mb-2"><strong className="text-gray-900">Adresse :</strong> Rue de la Clef, 96 - B-4620 Fléron, Belgique</p>
              <p className="mb-2"><strong className="text-gray-900">Numéro TVA :</strong> [À compléter]</p>
              <p className="mb-2"><strong className="text-gray-900">Téléphone :</strong> +32 (0)4/358.60.99</p>
              <p className="mb-2"><strong className="text-gray-900">Email :</strong> contact@lacabrade.com</p>
            </section>

            {/* Directeur de publication */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Directeur de publication</h2>
              <p>[À compléter - Nom et prénom du responsable légal]</p>
            </section>

            {/* Hébergement */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Hébergement</h2>
              <p className="mb-2"><strong className="text-gray-900">Hébergeur :</strong> Railway Corp.</p>
              <p className="mb-2"><strong className="text-gray-900">Site web :</strong> <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700">railway.app</a></p>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Propriété intellectuelle</h2>
              <p className="mb-3">
                L'ensemble du contenu de ce site (textes, images, vidéos, logos, etc.) est la propriété exclusive de La Cabrade ou de ses partenaires.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication, transmission, ou dénaturation, totale ou partielle du site ou de son contenu, par quelque procédé que ce soit, et sur quelque support que ce soit, est interdite sans l'autorisation préalable expresse de La Cabrade.
              </p>
            </section>

            {/* Protection des données */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Protection des données personnelles</h2>
              <p className="mb-3">
                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi belge du 30 juillet 2018 relative à la protection des personnes physiques à l'égard des traitements de données à caractère personnel, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.
              </p>
              <p>
                Pour plus d'informations sur la protection de vos données, consultez notre <a href="/confidentialite" className="text-amber-600 hover:text-amber-700 underline">Politique de Confidentialité</a>.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies</h2>
              <p>
                Le site utilise des cookies pour améliorer votre expérience de navigation. Pour en savoir plus, consultez notre <a href="/cookies" className="text-amber-600 hover:text-amber-700 underline">Politique relative aux Cookies</a>.
              </p>
            </section>

            {/* Liens hypertextes */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Liens hypertextes</h2>
              <p className="mb-3">
                Le site peut contenir des liens vers d'autres sites internet. La Cabrade ne saurait être tenue responsable du contenu de ces sites tiers.
              </p>
              <p>
                La création de liens hypertextes vers le site lacabrade.com nécessite une autorisation préalable écrite de La Cabrade.
              </p>
            </section>

            {/* Responsabilité */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation de responsabilité</h2>
              <p className="mb-3">
                La Cabrade s'efforce d'assurer au mieux l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, elle ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.
              </p>
              <p>
                La Cabrade décline toute responsabilité en cas d'interruption du site, de survenance de bugs, ou de dommages résultant d'une intrusion frauduleuse d'un tiers.
              </p>
            </section>

            {/* Droit applicable */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Droit applicable et juridiction</h2>
              <p className="mb-3">
                Les présentes mentions légales sont régies par le droit belge.
              </p>
              <p>
                En cas de litige, et à défaut d'accord amiable, les tribunaux belges seront seuls compétents.
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

