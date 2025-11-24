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
      {/* Annonce promotionnelle */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white text-center py-2 text-sm font-medium">
        <p className="animate-fade-in">
          -10% pour les nouveaux clients avec le code BIENVENUE10 | Livraison gratuite dès 100€
        </p>
      </div>

      {/* Header principal */}
      <header className="relative bg-white border-b border-ui-border-base shadow-sm transition-all duration-300 hover:shadow-md">
        {/* Top Bar - Langue/Région uniquement à droite */}
        <div className="bg-gray-50 border-b border-gray-200 hidden lg:block">
          <div className="content-container">
            <div className="flex items-center justify-end h-8 text-xs">
              <TopBar regions={regions} />
            </div>
          </div>
        </div>

        {/* Main Header: Logo - Search - Icons */}
        <div className="content-container py-4">
          <div className="flex items-center justify-between gap-8">
            {/* Logo (Left) */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <SideMenu regions={regions} categories={categories} />
              </div>

              <LocalizedClientLink
                href="/"
                className="flex items-center gap-3 group/logo"
                data-testid="nav-store-link"
              >
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                    La Cabrade
                  </h1>
                  <p className="text-xs text-gray-500 -mt-1">LC•EQUESTRIAN</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                    LC•EQUESTRIAN
                  </h1>
                </div>
              </LocalizedClientLink>
            </div>

            {/* Search Bar (Center) */}
            <div className="hidden lg:block flex-1 max-w-2xl mx-auto">
              <SearchBar />
            </div>

            {/* Icons (Right) */}
            <div className="flex items-center gap-3 justify-end">
              {/* Mobile Search Icon */}
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

              <WishlistButton />

              <LocalizedClientLink
                href="/account"
                className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                data-testid="nav-account-link"
                aria-label="Mon compte"
              >
                <User className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" />
              </LocalizedClientLink>

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
        </div>

        {/* Menu Navigation (Below) */}
        <div className="hidden lg:block border-t border-gray-100 py-3">
          <div className="content-container">
            <nav className="flex items-center justify-center gap-6">
              {/* 1. Catégories dynamiques */}
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

              {/* 3. LC Equestrian */}
               <NavLink
                href="/categories/lc-equestrian"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                LC Equestrian
              </NavLink>

              {/* 4. Outlet */}
              <NavLink
                href="/outlet"
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                activeClassName="bg-red-100 text-red-800 shadow-sm"
              >
                Outlet
              </NavLink>

              {/* 5. Bon cadeau */}
              <NavLink
                href="/produits/bon-cadeau"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                Bon cadeau
              </NavLink>

              {/* 6. Marques */}
              <BrandsMenu collections={collections} />

              {/* 7. À Propos */}
              <NavLink
                href="/a-propos"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                activeClassName="bg-amber-100 text-amber-700 shadow-sm"
              >
                À Propos
              </NavLink>
            </nav>
          </div>
        </div>

        {/* Barre de recherche mobile sous le header */}
        <div className="lg:hidden pb-4 content-container">
          <SearchBar />
        </div>
      </header>
    </div>
  )
}
