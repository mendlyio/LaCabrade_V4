import { getCategoriesList } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NewsletterForm from "@modules/layout/components/newsletter-form"

export default async function Footer() {
  const { collections } = await getCollectionsList(0, 12)
  const { product_categories } = await getCategoriesList(0, 12)

  // Organiser les catégories par parent
  const parentCategories = product_categories?.filter(cat => !cat.parent_category) || []

  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200">
      {/* Newsletter Section */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white">
        <div className="content-container py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">
              Inscrivez-vous à notre newsletter
            </h2>
            <p className="text-amber-100 mb-8 text-lg">
              Recevez des informations sur les nouvelles collections, les événements et les offres spéciales
            </p>
            <NewsletterForm />
            <div className="mt-6 flex items-center justify-center gap-8 text-sm text-amber-100">
              <span className="flex items-center gap-2">
                <span>✓</span> Promotions exclusives
              </span>
              <span className="flex items-center gap-2">
                <span>✓</span> Conseils d&apos;experts
              </span>
              <span className="flex items-center gap-2">
                <span>✓</span> Nouveautés en avant-première
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="content-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Colonne 1: À propos */}
          <div className="lg:col-span-1">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-3 mb-6 group"
            >
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">La Cabrade</h3>
                <p className="text-sm text-gray-600">LC•EQUESTRIAN</p>
              </div>
            </LocalizedClientLink>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Sellerie - Magasin d&apos;équitation à Fléron, près de Liège.
              Des prix justes, du matériel fiable pour les passionnés d&apos;équitation.
            </p>
            
            {/* Réseaux sociaux */}
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 hover:border-amber-600 hover:bg-amber-50 flex items-center justify-center text-gray-600 hover:text-amber-600 transition-all duration-200 hover:scale-110"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 hover:border-amber-600 hover:bg-amber-50 flex items-center justify-center text-gray-600 hover:text-amber-600 transition-all duration-200 hover:scale-110"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 hover:border-amber-600 hover:bg-amber-50 flex items-center justify-center text-gray-600 hover:text-amber-600 transition-all duration-200 hover:scale-110"
                aria-label="YouTube"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 hover:border-amber-600 hover:bg-amber-50 flex items-center justify-center text-gray-600 hover:text-amber-600 transition-all duration-200 hover:scale-110"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Colonne 2: Catégories */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="text-amber-600">📁</span>
              Catégories
            </h3>
            <ul className="space-y-3">
              {parentCategories.slice(0, 8).map((category) => (
                <li key={category.id}>
                        <LocalizedClientLink
                    href={`/categories/${category.handle}`}
                    className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                    {category.name}
                                  </LocalizedClientLink>
                                </li>
                              ))}
              {parentCategories.length > 8 && (
                <li>
                  <LocalizedClientLink
                    href="/store"
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
                  >
                    Toutes les catégories
                    <span>→</span>
                  </LocalizedClientLink>
                </li>
              )}
                </ul>
              </div>

          {/* Colonne 3: Collections */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="text-amber-600">🎨</span>
                  Collections
            </h3>
            <ul className="space-y-3">
              {collections.slice(0, 8).map((collection) => (
                <li key={collection.id}>
                      <LocalizedClientLink
                    href={`/collections/${collection.handle}`}
                    className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                      >
                    <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                    {collection.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>

          {/* Colonne 4: Service Client */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="text-amber-600">💬</span>
              Service Client
            </h3>
            <ul className="space-y-3">
              <li>
                <LocalizedClientLink
                  href="/account"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Mon compte
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/account?tab=orders"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Mes commandes
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/contact"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Nous contacter
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/faq"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  FAQ
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/livraison"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Livraison
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/retours"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Retours & Remboursements
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/garanties"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Garanties
                </LocalizedClientLink>
              </li>
            </ul>
          </div>

          {/* Colonne 5: Informations */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="text-amber-600">ℹ️</span>
              Informations
            </h3>
            <ul className="space-y-3 mb-6">
              <li>
                <LocalizedClientLink
                  href="/qui-sommes-nous"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Qui sommes-nous
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/magasins"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Nos magasins
                </LocalizedClientLink>
                </li>
                <li>
                <LocalizedClientLink
                  href="/blog"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Blog & Conseils
                </LocalizedClientLink>
                </li>
                <li>
                <LocalizedClientLink
                  href="/recrutement"
                  className="text-sm text-gray-600 hover:text-amber-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-amber-500 group-hover:scale-150 transition-all"></span>
                  Recrutement
                </LocalizedClientLink>
                </li>
              </ul>

            {/* Contact Info */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <h4 className="text-xs font-semibold text-gray-900 mb-3">
                Besoin d&apos;aide ?
              </h4>
              <div className="space-y-2 text-sm">
                <a
                  href="tel:+3243586099"
                  className="flex items-center gap-2 text-gray-600 hover:text-amber-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                  <span>+32 (0)4/358.60.99</span>
                </a>
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  Rue de la Clef, 96<br/>
                  B-4620 Fléron<br/><br/>
                  Lu: Fermé<br/>
                  Ma-Ve: 10h-18h<br/>
                  Sam: 10h-17h
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges / Avantages */}
        <div className="border-t border-gray-300 pt-12 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                <svg className="w-8 h-8 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </div>
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                Livraison rapide
              </h4>
              <p className="text-xs text-gray-600">
                Gratuite dès 100€
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                Paiement sécurisé
              </h4>
              <p className="text-xs text-gray-600">
                CB, PayPal, Virement
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              </div>
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                Retours gratuits
              </h4>
              <p className="text-xs text-gray-600">
                Sous 30 jours
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                <svg className="w-8 h-8 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                Service client
              </h4>
              <p className="text-xs text-gray-600">
                Disponible 6j/7
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-300 bg-white">
        <div className="content-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 text-center md:text-left">
              © {new Date().getFullYear()} La Cabrade - LC•EQUESTRIAN. Tous droits réservés.
              {" "}<span className="text-gray-400">|</span>{" "}
              Créée par une cavalière pour des cavaliers
            </div>
            <div className="flex items-center gap-6 text-sm">
              <LocalizedClientLink
                href="/mentions-legales"
                className="text-gray-600 hover:text-amber-600 transition-colors"
              >
                Mentions légales
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/cgv"
                className="text-gray-600 hover:text-amber-600 transition-colors"
              >
                CGV
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/confidentialite"
                className="text-gray-600 hover:text-amber-600 transition-colors"
              >
                Confidentialité
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/cookies"
                className="text-gray-600 hover:text-amber-600 transition-colors"
              >
                Cookies
              </LocalizedClientLink>
            </div>
          </div>
          
          {/* Payment methods */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 mr-2">Moyens de paiement:</span>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 hover:border-amber-300 hover:bg-amber-50 transition-all flex items-center gap-2">
                <svg className="w-6 h-4" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="#1A1F71"/>
                  <text x="10" y="22" fill="white" fontSize="14" fontWeight="bold">VISA</text>
                </svg>
                <span>Carte bancaire</span>
              </div>
              
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 hover:border-amber-300 hover:bg-amber-50 transition-all flex items-center gap-2">
                <svg className="w-6 h-4" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="white" stroke="#ddd"/>
                  <circle cx="18" cy="16" r="7" fill="#EB001B"/>
                  <circle cx="30" cy="16" r="7" fill="#F79E1B"/>
                </svg>
                <span>Mastercard</span>
              </div>
              
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 hover:border-amber-300 hover:bg-amber-50 transition-all flex items-center gap-2">
                <svg className="w-6 h-4" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="#003087"/>
                  <text x="8" y="22" fill="white" fontSize="12" fontWeight="bold">PayPal</text>
                </svg>
                <span>PayPal</span>
              </div>
              
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 hover:border-amber-300 hover:bg-amber-50 transition-all flex items-center gap-2">
                <svg className="w-6 h-4" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="#005498"/>
                  <rect x="14" y="12" width="20" height="8" fill="white" rx="1"/>
                </svg>
                <span>Bancontact</span>
              </div>
              
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 hover:border-amber-300 hover:bg-amber-50 transition-all">
                Virement
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
