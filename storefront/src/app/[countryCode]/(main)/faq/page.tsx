import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "FAQ - Questions fréquentes - La Cabrade",
  description: "Toutes les réponses à vos questions sur la livraison, les retours, le paiement et nos produits équestres.",
}

export default function FAQPage() {
  const faqs = [
    {
      category: "Commande & Paiement",
      icon: "💳",
      questions: [
        {
          q: "Quels moyens de paiement acceptez-vous ?",
          a: "Nous acceptons les cartes bancaires (Visa, Mastercard), PayPal, Bancontact et les virements bancaires. Tous les paiements sont sécurisés via notre plateforme de paiement certifiée."
        },
        {
          q: "Puis-je modifier ou annuler ma commande ?",
          a: "Vous pouvez modifier ou annuler votre commande dans les 2 heures suivant sa validation. Au-delà, contactez-nous rapidement au +32 (0)4/358.60.99 et nous ferons notre possible pour vous aider."
        },
        {
          q: "Comment suivre ma commande ?",
          a: "Vous recevrez un email de confirmation avec un numéro de suivi dès l'expédition de votre commande. Vous pouvez également suivre votre commande depuis votre compte client."
        },
      ]
    },
    {
      category: "Livraison",
      icon: "🚚",
      questions: [
        {
          q: "Quels sont les délais de livraison ?",
          a: "Livraison standard en 3-5 jours ouvrés en Belgique. Livraison express en 24-48h disponible. Pour l'international, comptez 5-10 jours ouvrés."
        },
        {
          q: "La livraison est-elle gratuite ?",
          a: "Oui ! La livraison est gratuite en Belgique pour toute commande de 100€ ou plus. En dessous de 100€, les frais de livraison sont de 7,50€."
        },
        {
          q: "Livrez-vous à l'international ?",
          a: "Oui, nous livrons dans toute l'Europe. Les frais de livraison varient selon la destination et sont calculés lors du passage de commande."
        },
      ]
    },
    {
      category: "Retours & Échanges",
      icon: "↩️",
      questions: [
        {
          q: "Quelle est votre politique de retour ?",
          a: "Vous disposez de 30 jours pour retourner un produit qui ne vous convient pas. Les articles doivent être non portés, non utilisés, avec leurs étiquettes d'origine. Les retours sont gratuits en Belgique."
        },
        {
          q: "Comment faire un retour ?",
          a: "Connectez-vous à votre compte, rendez-vous dans 'Mes commandes', sélectionnez la commande concernée et cliquez sur 'Retourner un article'. Suivez ensuite les instructions."
        },
        {
          q: "Quand vais-je être remboursé ?",
          a: "Une fois votre retour reçu et contrôlé (sous 2-3 jours), nous procédons au remboursement sous 5-7 jours ouvrés sur votre moyen de paiement initial."
        },
      ]
    },
    {
      category: "Produits",
      icon: "🏇",
      questions: [
        {
          q: "Les produits sont-ils garantis ?",
          a: "Oui, tous nos produits bénéficient de la garantie légale de conformité de 2 ans. Certains produits ont également une garantie fabricant supplémentaire."
        },
        {
          q: "Comment choisir la bonne taille ?",
          a: "Chaque fiche produit dispose d'un guide des tailles détaillé. En cas de doute, n'hésitez pas à nous contacter pour un conseil personnalisé."
        },
        {
          q: "Avez-vous un magasin physique ?",
          a: "Oui ! Notre magasin se trouve Rue de la Clef, 96 à Fléron (B-4620), près de Liège. Ouvert du mardi au vendredi de 10h à 18h et le samedi de 10h à 17h."
        },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                ❓ Foire Aux Questions
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Comment pouvons-nous vous aider ?
            </h1>
            <p className="text-white/90 text-lg">
              Trouvez rapidement les réponses à vos questions les plus fréquentes.
            </p>
          </div>
        </div>

        {/* Recherche rapide */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher dans la FAQ..."
              className="w-full px-6 py-4 pr-12 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:outline-none text-lg"
            />
            <svg className="w-6 h-6 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqs.map((category, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  {category.category}
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {category.questions.map((item, qIdx) => (
                  <div key={qIdx} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-start gap-2">
                      <span className="text-amber-600 flex-shrink-0">Q:</span>
                      <span>{item.q}</span>
                    </h3>
                    <p className="text-gray-600 leading-relaxed pl-6">
                      <span className="text-green-600 font-semibold">R:</span> {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Vous ne trouvez pas votre réponse ?
          </h2>
          <p className="text-gray-600 mb-6">
            Notre équipe est là pour vous aider ! Contactez-nous et nous vous répondrons rapidement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LocalizedClientLink href="/contact">
              <button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center gap-2">
                💬 Nous contacter
              </button>
            </LocalizedClientLink>
            <a href="tel:+3243586099" className="bg-white hover:bg-gray-50 border-2 border-amber-600 text-amber-600 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center gap-2">
              📞 +32 (0)4/358.60.99
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

