import { Suspense } from "react"
import { listRegions } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import WishlistButton from "@modules/layout/components/wishlist-button"
import SideMenu from "@modules/layout/components/side-menu"
import SearchBar from "@modules/layout/components/search-bar"
import NavLink from "@modules/layout/components/nav-link"
import TopBar from "@modules/layout/components/top-bar"
import BrandsMenu from "@modules/layout/components/brands-menu"
import MegaMenu from "@modules/layout/components/mega-menu"
import {
  MagnifyingGlass,
  User,
  ShoppingBag,
} from "@medusajs/icons"

export default async function Nav() {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)
  const categories = await listCategories()
  const { collections } = await getCollectionsList(0, 50)

  // Filtrer les catégories racines (Niveau 0)
  const parentCategories = categories.filter((c) => c.parent_category_id === null)

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      {/* Header principal */}
      <header className="relative bg-white border-b border-ui-border-base shadow-sm transition-all duration-300 hover:shadow-md">
        {/* Top Bar - Call to action + Langue */}
        <TopBar regions={regions} />

        {/* Niveau 1 : Logo + Recherche + Icons + Panier */}
        <div className="content-container">
          <div className="flex items-center justify-between h-20 gap-8">
            {/* Mobile Menu + Logo */}
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <SideMenu regions={regions} categories={categories} />
              </div>

              {/* Logo */}
              <LocalizedClientLink
                href="/"
                className="flex items-center gap-3 group/logo"
                data-testid="nav-store-link"
              >
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold text-amber-700">
                    La Cabrade
                  </h1>
                  <p className="text-xs text-gray-500 -mt-1">LC•EQUESTRIAN</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-xl font-bold text-amber-700">
                    LC•EQUESTRIAN
                  </h1>
                </div>
              </LocalizedClientLink>
            </div>

            {/* Actions de droite : Recherche + Icons + Panier */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              {/* Recherche Desktop - Ultra visible */}
              <div className="hidden xl:block w-full max-w-xl">
                <div className="relative">
                  <SearchBar />
                </div>
              </div>

              {/* Icône recherche mobile */}
              {process.env.NEXT_PUBLIC_FEATURE_SEARCH_ENABLED && (
                <LocalizedClientLink
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  href="/search"
                  scroll={false}
                  data-testid="nav-search-link"
                  aria-label="Recherche"
                >
                  <MagnifyingGlass className="w-5 h-5 text-gray-600" />
                </LocalizedClientLink>
              )}

              {/* Wishlist */}
              <WishlistButton />

              {/* Compte */}
              <LocalizedClientLink
                href="/account"
                className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                data-testid="nav-account-link"
                aria-label="Mon compte"
              >
                <User className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" />
              </LocalizedClientLink>

              {/* Panier */}
              <Suspense
                fallback={
                  <LocalizedClientLink
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
                    href="/cart"
                    data-testid="nav-cart-link"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span className="hidden sm:inline">Panier</span>
                    <span className="bg-white text-amber-600 text-xs px-2 py-0.5 rounded-full font-bold">
                      0
                    </span>
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>
            </div>
          </div>

          {/* Barre de recherche mobile */}
          <div className="xl:hidden pb-4">
            <SearchBar />
          </div>
        </div>

        {/* Niveau 2 : Menu Navigation Centré (Desktop uniquement) */}
        <nav className="hidden lg:block border-t border-gray-100 bg-white">
          <div className="content-container">
            <div className="flex items-center gap-1 justify-center py-3">
              {/* 1. Catégories dynamiques (Backoffice) */}
              {parentCategories.map((category) => (
                <MegaMenu key={category.id} category={category} />
              ))}

              {/* 2. Nouveautés */}
              <NavLink
                href="/nouveautes"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Nouveautés
              </NavLink>

              {/* 3. Outlet */}
              <NavLink
                href="/outlet"
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                activeClassName="bg-red-100 text-red-800 shadow-sm"
              >
                Outlet
              </NavLink>

              {/* 4. Bon cadeau */}
              <NavLink
                href="/produits/bon-cadeau"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Bon cadeau
              </NavLink>

              {/* 5. Marques (Dropdown dynamique) */}
              <BrandsMenu collections={collections} />

              {/* 6. À Propos */}
              <NavLink
                href="/a-propos"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                À Propos
              </NavLink>
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
