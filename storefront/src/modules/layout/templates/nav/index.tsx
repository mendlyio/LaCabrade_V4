import { Suspense } from "react"
import Image from "next/image"
import { listRegions, FALLBACK_REGIONS } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { listBrands } from "@lib/data/brands"
import { buildCategoryTree } from "@lib/util/category-tree"
import { getCartCountSafe } from "@lib/data/cookies"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import WishlistButton from "@modules/layout/components/wishlist-button"
import SideMenu from "@modules/layout/components/side-menu"
import SearchBar from "@modules/layout/components/search-bar"
import TopBar from "@modules/layout/components/top-bar"
import BrandsMenu from "@modules/layout/components/brands-menu"
import MegaMenu from "@modules/layout/components/mega-menu"
import NavLinks from "@modules/layout/components/nav-links"
import NavAccountLink from "@modules/layout/components/nav-account-link"
import NavCartFallback from "@modules/layout/components/nav-cart-fallback"
import NavSearchLink from "@modules/layout/components/nav-search-link"

export default async function Nav() {
  let regions: StoreRegion[] = FALLBACK_REGIONS
  let categories: any[] = []
  let brands: any[] = []
  let cachedCartCount = 0

  try {
    ;[regions, categories, brands, cachedCartCount] = await Promise.all([
      listRegions().then((r: StoreRegion[]) => r),
      listCategories(),
      listBrands(),
      getCartCountSafe(),
    ])
  } catch (error) {
    console.error("[Nav] Backend indisponible, utilisation des valeurs de repli:", error)
    try {
      cachedCartCount = await getCartCountSafe()
    } catch {
      // ignore
    }
  }

  // Filtrer les catégories racines (Niveau 0) et actives
  const { roots } = buildCategoryTree(categories)
  const parentCategories = roots.filter((c) => (c as any).is_active !== false)

  return (
    <div className="sticky top-0 inset-x-0 z-[120] isolate group">
      {/* Header principal */}
      <header className="relative bg-white border-b border-ui-border-base shadow-sm transition-all duration-300 hover:shadow-md">
        {/* Top Bar - Call to action + Langue */}
        <TopBar regions={regions} />

        {/* Niveau 1 : Logo + Recherche + Icons + Panier */}
        <div className="content-container">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-8">
            {/* Mobile Menu + Logo */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="lg:hidden">
                <SideMenu regions={regions} categories={categories} brands={brands} />
              </div>

              {/* Logo */}
              <LocalizedClientLink
                href="/"
                className="flex items-center group/logo"
                data-testid="nav-store-link"
              >
                <Image
                  src="https://ik.imagekit.io/kodt9cn6f/Logo-cabrade.webp"
                  alt="La Cabrade"
                  width={280}
                  height={125}
                  priority
                  quality={75}
                  sizes="(max-width: 1024px) 140px, 180px"
                  className="h-10 sm:h-12 lg:h-14 w-auto object-contain"
                />
              </LocalizedClientLink>
            </div>

            {/* Actions de droite : Recherche + Icons + Panier */}
            <div className="flex items-center gap-1 sm:gap-3 flex-1 justify-end">
              {/* Recherche Desktop - Ultra visible */}
              <div className="hidden xl:block w-full max-w-xl">
                <div className="relative">
                  <SearchBar />
                </div>
              </div>

              {/* Icône recherche mobile */}
              {process.env.NEXT_PUBLIC_FEATURE_SEARCH_ENABLED && (
                <NavSearchLink />
              )}

              {/* Compte */}
              <NavAccountLink />

              {/* Wishlist */}
              <WishlistButton />

              {/* Panier */}
              <Suspense fallback={<NavCartFallback cachedCartCount={cachedCartCount} />}>
                <CartButton />
              </Suspense>
            </div>
          </div>

          {/* Barre de recherche mobile */}
          <div className="xl:hidden pb-3 sm:pb-4">
            <SearchBar />
          </div>
        </div>

        {/* Niveau 2 : Menu Navigation Centré (Desktop uniquement) */}
        <nav className="hidden lg:block border-t border-gray-100 bg-white mega-menu-nav">
          <div className="content-container">
            <div className="flex items-center gap-1 justify-center py-3">
              {/* 1. Nouveautés */}
              <NavLinks variant="nouveautes" />
              {/* 2. Catégories dynamiques (Backoffice) */}
              {parentCategories.map((category) => (
                <MegaMenu key={category.id} category={category} />
              ))}
              {/* 3. Bon cadeau */}
              <NavLinks variant="bon_cadeau" />
              {/* 4. Marques (Dropdown dynamique) */}
              <BrandsMenu brands={brands} />
              {/* 5. A Propos */}
              <NavLinks variant="a_propos" />
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
