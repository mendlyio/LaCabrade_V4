"use client"

import Image from "next/image"
import ScrollCarousel from "@modules/common/components/scroll-carousel"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import HeroCarousel from "@modules/home/components/hero-carousel"
import { useTranslate } from "@lib/context/language-context"
import { HttpTypes } from "@medusajs/types"
import { ReactNode } from "react"

type HomeContentProps = {
  region: HttpTypes.StoreRegion
  lcEquestrianProducts: any[]
  newProducts: any[]
  mainCategories: any[]
  lcProductCards?: ReactNode
  newProductCards?: ReactNode
}

export default function HomeContent({
  region,
  lcEquestrianProducts,
  newProducts,
  mainCategories,
  lcProductCards,
  newProductCards,
}: HomeContentProps) {
  const t = useTranslate()

  return (
    <div className="relative z-0 w-full">
      <h1 className="sr-only">
        Sellerie Belgique, sellerie équestre — La Cabrade &amp; LC Equestrian
      </h1>

      {/* Hero Carrousel */}
      <HeroCarousel />

      {/* Section LC Equestrian */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-amber-600">LC Equestrian</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t("home.lc_desc" as any)}
            </p>
          </div>
          {lcEquestrianProducts.length > 0 ? (
            <>
              <ScrollCarousel className="-mx-4 px-4">
                <div className="flex gap-3 sm:gap-4 pb-4">
                  {lcProductCards}
                </div>
              </ScrollCarousel>
              <div className="text-center mt-8">
                <LocalizedClientLink
                  href="/lc-equestrian"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  {t("home.view_collection" as any)}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </LocalizedClientLink>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <p className="text-gray-600 mb-6">{t("home.lc_coming_soon" as any)}</p>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300"
              >
                {t("home.discover_products" as any)}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </LocalizedClientLink>
            </div>
          )}
        </div>
      </section>

      {/* Section Catégories */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.our_categories" as any)}</h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              {t("home.categories_desc" as any)}
            </p>
          </div>
          {mainCategories.length > 0 ? (
            <ScrollCarousel className="-mx-4 px-4">
              <div className="flex gap-6 pb-4">
                {mainCategories.map((category) => {
                  const categoryImage = category._image || ""
                  const handle = category?.handle
                  if (!handle) return null
                  return (
                    <LocalizedClientLink
                      key={category.id}
                      href={`/categories/${encodeURIComponent(handle)}`}
                      className="flex-none w-[calc(100%-32px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] group/card relative block overflow-hidden rounded-2xl aspect-square bg-gray-200 shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-xl cursor-pointer"
                    >
                      {categoryImage ? (
                        <Image
                          src={categoryImage}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 90vw, (max-width: 768px) 45vw, (max-width: 1024px) 30vw, 22vw"
                          quality={65}
                          className="object-cover transition-transform duration-500 group-hover/card:scale-[1.03] pointer-events-none"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-300 pointer-events-none" aria-hidden />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 p-5 text-left">
                        <h3 className="text-lg md:text-xl font-semibold text-white drop-shadow">
                          {category.name}
                        </h3>
                        <div className="mt-2 inline-flex items-center gap-2 text-sm text-white/90 font-medium opacity-0 translate-y-2 transition-all duration-300 group-hover/card:opacity-100 group-hover/card:translate-y-0">
                          {t("home.discover" as any)}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </LocalizedClientLink>
                  )
                })}
              </div>
            </ScrollCarousel>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-600">{t("home.categories_coming_soon" as any)}</p>
            </div>
          )}
        </div>
      </section>

      {/* Section Icônes Info */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="content-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{t("home.free_shipping" as any)}</h3>
              <p className="text-xs text-gray-500">{t("home.free_shipping_from" as any)}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{t("home.fast_shipping" as any)}</h3>
              <p className="text-xs text-gray-500">{t("home.fast_shipping_time" as any)}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{t("home.after_sales" as any)}</h3>
              <p className="text-xs text-gray-500">{t("home.returns_days" as any)}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{t("home.pickup_points" as any)}</h3>
              <p className="text-xs text-gray-500">{t("home.pickup_free" as any)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bandeau Selle sur-mesure */}
      <section
        className="relative py-24 md:py-32 bg-cover bg-center overflow-hidden"
        style={{
          backgroundImage: "url(https://ik.imagekit.io/kodt9cn6f/Cabrade/selles-sur-mesure.webp)",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="content-container relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-2xl">
              {t("home.custom_saddle" as any)}
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-white/90 drop-shadow-lg">
              {t("home.custom_saddle_desc" as any)}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <a
                href="tel:+3243586099"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base w-auto"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                +32 (0)4/358.60.99
              </a>
              <LocalizedClientLink
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-amber-700 transition-all duration-300 text-sm sm:text-base w-auto"
              >
                {t("home.contact" as any)}
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </section>

      {/* Section Nouveautés */}
      <section className="py-16 bg-gray-50">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.new_products" as any)}</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t("home.new_products_desc" as any)}
            </p>
          </div>
          {newProducts.length > 0 ? (
            <>
              <ScrollCarousel className="-mx-4 px-4">
                <div className="flex gap-3 sm:gap-4 pb-4">
                  {newProductCards}
                </div>
              </ScrollCarousel>
              <div className="text-center mt-8">
                <LocalizedClientLink
                  href="/nouveautes"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  {t("home.view_all_new" as any)}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </LocalizedClientLink>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-600 mb-6">
                {t("home.new_coming_soon" as any)}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
