import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Conditions Générales de Vente - La Cabrade",
  description: "Conditions générales de vente de La Cabrade. Informations sur les commandes, paiements, livraisons et retours.",
}

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container max-w-4xl">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions Générales de Vente</h1>
          
          <div className="prose max-w-none space-y-6 text-gray-600">
            {/* Préambule */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Préambule</h2>
              <p>
                Les présentes conditions générales de vente (CGV) régissent les relations contractuelles entre La Cabrade (ci-après "le Vendeur") et toute personne physique ou morale souhaitant effectuer un achat via le site lacabrade.com (ci-après "le Client").
              </p>
              <p>
                En validant une commande sur notre site, le Client reconnaît avoir pris connaissance et accepté sans réserve les présentes CGV.
              </p>
            </section>

            {/* Article 1 - Produits */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 1 - Produits et services</h2>
              <p>
                Les produits proposés sont ceux qui figurent sur le site lacabrade.com, dans la limite des stocks disponibles. Les photographies et descriptions sont aussi précises que possible mais ne constituent pas un engagement contractuel.
              </p>
              <p>
                Le Vendeur se réserve le droit de modifier à tout moment l'assortiment de produits.
              </p>
            </section>

            {/* Article 2 - Prix */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 2 - Prix</h2>
              <p className="mb-3">
                Les prix sont indiqués en euros (€), toutes taxes comprises (TTC), hors frais de livraison.
              </p>
              <p className="mb-3">
                Le Vendeur se réserve le droit de modifier ses prix à tout moment, étant toutefois entendu que le prix figurant au catalogue le jour de la commande sera le seul applicable au Client.
              </p>
              <p>
                Les frais de livraison sont indiqués avant la validation définitive de la commande.
              </p>
            </section>

            {/* Article 3 - Commande */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 3 - Commande</h2>
              <p className="mb-3">
                Le Client sélectionne sur le site les produits qu'il désire commander, selon les modalités suivantes :
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-3">
                <li>Ajout des produits au panier</li>
                <li>Validation du panier et saisie de l'adresse de livraison</li>
                <li>Choix du mode de livraison</li>
                <li>Choix du moyen de paiement</li>
                <li>Validation définitive de la commande</li>
              </ul>
              <p>
                La vente ne sera considérée comme définitive qu'après l'envoi au Client d'un email de confirmation de commande par le Vendeur et après encaissement du prix.
              </p>
            </section>

            {/* Article 4 - Paiement */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 4 - Paiement</h2>
              <p className="mb-3">
                Le paiement s'effectue par :
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>Carte bancaire (Visa, Mastercard)</li>
                <li>PayPal</li>
                <li>Bancontact</li>
                <li>Virement bancaire (pour les professionnels uniquement)</li>
              </ul>
              <p>
                Les paiements effectués par carte bancaire sont sécurisés par notre partenaire Stripe. Les données de paiement ne transitent jamais par nos serveurs.
              </p>
            </section>

            {/* Article 5 - Livraison */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 5 - Livraison</h2>
              <p className="mb-3">
                Les délais de livraison sont les suivants :
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>Belgique : 3-5 jours ouvrés (standard) ou 24-48h (express)</li>
                <li>France : 5-7 jours ouvrés</li>
                <li>Autres pays d'Europe : 7-10 jours ouvrés</li>
              </ul>
              <p className="mb-3">
                Ces délais sont donnés à titre indicatif et ne constituent pas un engagement contractuel. Les retards de livraison ne peuvent donner lieu à l'annulation de la commande, sauf en cas de retard supérieur à 30 jours.
              </p>
              <p>
                La livraison est gratuite en Belgique pour toute commande de 100€ ou plus.
              </p>
            </section>

            {/* Article 6 - Droit de rétractation */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 6 - Droit de rétractation</h2>
              <p className="mb-3">
                Conformément aux dispositions légales, le Client dispose d'un délai de 30 jours à compter de la réception du produit pour exercer son droit de rétractation sans avoir à justifier de motifs ni à payer de pénalité.
              </p>
              <p className="mb-3">
                Les produits doivent être retournés dans leur état d'origine, complets (emballage, accessoires, notice, etc.) et non portés/utilisés, avec leurs étiquettes d'origine.
              </p>
              <p>
                Les frais de retour sont à la charge du Client, sauf en cas d'erreur de notre part ou de produit défectueux.
              </p>
            </section>

            {/* Article 7 - Garanties */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 7 - Garanties</h2>
              <p className="mb-3">
                Tous les produits bénéficient de la garantie légale de conformité (article 1649bis et suivants du Code civil belge) et de la garantie contre les vices cachés (articles 1641 et suivants du Code civil belge).
              </p>
              <p>
                En cas de défaut de conformité, le Client peut choisir entre la réparation et le remplacement du bien. Si la réparation et le remplacement sont impossibles, le Client peut rendre le bien et se faire restituer le prix ou garder le bien et se faire rendre une partie du prix.
              </p>
            </section>

            {/* Article 8 - Responsabilité */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 8 - Responsabilité</h2>
              <p>
                Le Vendeur ne saurait être tenu responsable de l'inexécution du contrat en cas de force majeure, de perturbation ou grève totale ou partielle des services postaux ou de moyens de transport et/ou communications, d'inondation, d'incendie.
              </p>
            </section>

            {/* Article 9 - Protection des données */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 9 - Protection des données personnelles</h2>
              <p>
                Les informations collectées lors de la passation de commande sont nécessaires au traitement et à la livraison de celle-ci. Ces informations sont strictement confidentielles. Pour plus d'informations, consultez notre <a href="/confidentialite" className="text-amber-600 hover:text-amber-700 underline">Politique de Confidentialité</a>.
              </p>
            </section>

            {/* Article 10 - Litiges */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article 10 - Règlement des litiges</h2>
              <p className="mb-3">
                Les présentes CGV sont soumises au droit belge. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.
              </p>
              <p className="mb-3">
                À défaut d'accord amiable, le litige sera porté devant les tribunaux belges.
              </p>
              <p>
                Conformément à la législation européenne, le Client a également la possibilité de recourir à la plateforme européenne de règlement des litiges en ligne : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline">https://ec.europa.eu/consumers/odr</a>
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

