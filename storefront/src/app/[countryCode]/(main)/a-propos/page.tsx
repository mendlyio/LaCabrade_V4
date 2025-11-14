import { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "À propos de La Cabrade | Sellerie équestre à Fléron",
  description: "Découvrez l'histoire de La Cabrade, notre équipe passionnée et nos valeurs. Sellerie d'équitation près de Liège depuis plusieurs années.",
}

export default function AProposPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 py-20 border-b border-gray-200">
        <div className="content-container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              À propos de La Cabrade
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Votre sellerie de confiance à Fléron, près de Liège. Depuis plusieurs années, nous accompagnons les cavaliers et les passionnés d&apos;équitation avec des produits de qualité et des conseils d&apos;experts.
            </p>
          </div>
        </div>
      </section>

      {/* Notre Histoire */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Notre histoire
                </h2>
                <div className="prose prose-lg text-gray-600 space-y-4">
                  <p>
                    La Cabrade est née de la passion pour l&apos;équitation et du désir de créer un lieu de référence pour tous les cavaliers de la région liégeoise.
                  </p>
                  <p>
                    Notre magasin situé à Fléron propose une large gamme de produits pour le cheval et le cavalier : selles, bridons, tapis, protections, vêtements d&apos;équitation et bien plus encore.
                  </p>
                  <p>
                    Nous sélectionnons avec soin chaque produit pour vous garantir qualité, confort et durabilité. Notre équipe est là pour vous conseiller et vous accompagner dans vos choix.
                  </p>
                </div>
              </div>
              <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden shadow-lg">
                {/* Placeholder pour image du magasin */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <svg className="w-20 h-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm">Photo du magasin à ajouter</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notre Équipe */}
      <section className="py-16 bg-gray-50">
        <div className="content-container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Notre équipe
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Une équipe passionnée et expérimentée à votre service
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Membre 1 */}
              <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                <div className="relative h-64 bg-gradient-to-br from-amber-100 to-orange-100">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    [Nom à compléter]
                  </h3>
                  <p className="text-amber-600 font-medium mb-3">
                    Fondatrice & Gérante
                  </p>
                  <p className="text-sm text-gray-600">
                    Cavalière passionnée depuis plus de 20 ans, elle a créé La Cabrade pour partager sa passion et son expertise avec les cavaliers de la région.
                  </p>
                </div>
              </div>

              {/* Membre 2 */}
              <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                <div className="relative h-64 bg-gradient-to-br from-blue-100 to-indigo-100">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    [Nom à compléter]
                  </h3>
                  <p className="text-amber-600 font-medium mb-3">
                    Conseillère en équipement
                  </p>
                  <p className="text-sm text-gray-600">
                    Experte en sellerie et harnachement, elle vous guide dans le choix du matériel adapté à vos besoins et à votre discipline.
                  </p>
                </div>
              </div>

              {/* Membre 3 */}
              <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                <div className="relative h-64 bg-gradient-to-br from-green-100 to-emerald-100">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    [Nom à compléter]
                  </h3>
                  <p className="text-amber-600 font-medium mb-3">
                    Spécialiste vêtements & accessoires
                  </p>
                  <p className="text-sm text-gray-600">
                    Passionnée de mode équestre, elle vous conseille sur les dernières tendances et les équipements les plus adaptés à votre pratique.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nos Valeurs */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Nos valeurs
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Ce qui nous anime au quotidien
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Valeur 1 : Passion */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Passion
                </h3>
                <p className="text-sm text-gray-600">
                  L&apos;équitation est notre passion. Nous partageons votre amour des chevaux et comprenons vos besoins.
                </p>
              </div>

              {/* Valeur 2 : Expertise */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Expertise
                </h3>
                <p className="text-sm text-gray-600">
                  Des conseils avisés pour vous aider à choisir l&apos;équipement le plus adapté à votre pratique.
                </p>
              </div>

              {/* Valeur 3 : Proximité */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Proximité
                </h3>
                <p className="text-sm text-gray-600">
                  Un service personnalisé et une relation de confiance avec nos clients.
                </p>
              </div>

              {/* Valeur 4 : Qualité */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Qualité
                </h3>
                <p className="text-sm text-gray-600">
                  Nous sélectionnons avec soin des produits durables et fiables des meilleures marques.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Contact / Visite */}
      <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50 border-t border-gray-200">
        <div className="content-container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Venez nous rendre visite
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Notre équipe vous accueille avec plaisir dans notre magasin de Fléron
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <svg className="w-8 h-8 text-amber-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900 mb-2">Adresse</h3>
                <p className="text-sm text-gray-600">
                  Rue de la Clef, 96<br />
                  B-4620 Fléron
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <svg className="w-8 h-8 text-amber-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h3 className="font-semibold text-gray-900 mb-2">Téléphone</h3>
                <p className="text-sm text-gray-600">
                  <a href="tel:+3243586099" className="hover:text-amber-600 transition-colors">
                    +32 (0)4/358.60.99
                  </a>
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <svg className="w-8 h-8 text-amber-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-gray-900 mb-2">Horaires</h3>
                <p className="text-sm text-gray-600">
                  Ma-Ve: 10h-18h<br />
                  Sam: 10h-17h
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

