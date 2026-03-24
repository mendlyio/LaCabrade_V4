import { JSONRPCClient } from "json-rpc-2.0"

type Options = {
  url: string
  dbName: string
  username: string
  apiKey: string
}

export type Pagination = {
  offset?: number
  limit?: number
}

export type OdooProduct = {
  id: number
  name?: string
  display_name?: string
  list_price: number
  default_code?: string
  description_sale?: string
  qty_available?: number
  image_512?: string | false
  ept_image_ids?: number[] // IDs des images additionnelles dans common.product.image.ept (module EPT)
  weight?: number
  volume?: number
  categ_id: any // [id, name]
  currency_id: any // Peut être [id, name] ou {id, display_name}
  product_variant_ids: OdooProductVariant[]
  product_variant_count: number
  brand_id?: [number, string] | false // [id, name] ou false si pas de marque
  attribute_line_ids: {
    id: number
    attribute_id: {
      id: number
      name: string
      display_name: string
    }
    value_ids: {
      id: number
      name: string
    }[]
  }[]
}

export type OdooProductVariant = {
  id: number
  name?: string
  display_name?: string
  list_price: number
  lst_price?: number // Prix de vente public (inclut extras d'attributs)
  default_code?: string // Référence interne Odoo (Internal Reference)
  weight?: number
  volume?: number
  barcode?: string
  image_512?: string | false
  qty_available?: number
  currency_id: any // Peut être [id, name] ou {id, display_name}
  product_template_variant_value_ids: {
    id: number
    name: string
    attribute_id: {
      id: number
      name: string
      display_name: string
    }
  }[]
}

export type OdooCategory = {
  id: number
  name: string
  parent_id: any // [id, name] ou false
}

export default class OdooModuleService {
  /**
   * Champ "marque" Odoo configurable.
   * IMPORTANT: certains Odoo n'ont pas `brand_id` → si le champ n'existe pas,
   * on doit éviter de casser la liste des produits.
   */
  private getBrandField(): string | null {
    const field = process.env.ODOO_BRAND_FIELD || "brand_id"
    return field?.trim() ? field.trim() : null
  }

  /**
   * Lecture robuste de product.template: si un champ est inconnu (ex: brand_id, ept_image_ids),
   * on retente sans ce champ au lieu d'échouer (sinon l'admin affiche "Aucun produit").
   * Gère les champs optionnels qui peuvent ne pas exister selon la version Odoo.
   */
  private async safeReadProductTemplates(
    productIds: number[],
    fields: string[]
  ): Promise<OdooProduct[]> {
    const optionalFields = [this.getBrandField(), "ept_image_ids"].filter(Boolean) as string[]
    
    const tryReadWithFields = async (fieldsToTry: string[]): Promise<OdooProduct[]> => {
      try {
        return await this.client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            this.options.dbName,
            this.uid!,
            this.options.apiKey,
            "product.template",
            "read",
            [productIds],
            { fields: fieldsToTry },
          ],
        })
      } catch (error: any) {
        const msg = `${[
          error?.message,
          error?.data?.message,
          error?.data?.debug,
          error,
        ]
          .filter(Boolean)
          .join(" | ")}`.toLowerCase()

        // Chercher quel champ optionnel pose problème
        for (const optField of optionalFields) {
          if (
            optField &&
            fieldsToTry.includes(optField) &&
            (msg.includes("unknown field") ||
              msg.includes("invalid field") ||
              (msg.includes("field") && msg.includes("does not exist")) ||
              msg.includes(optField.toLowerCase()))
          ) {
            console.warn(`⚠️ [ODOO] Champ '${optField}' indisponible, retry sans ce champ`)
            const newFields = fieldsToTry.filter((f) => f !== optField)
            // Retry récursif sans ce champ
            return await tryReadWithFields(newFields)
          }
        }

        // Aucun champ optionnel ne pose problème → erreur réelle
        throw error
      }
    }

    return await tryReadWithFields(fields)
  }
  /**
   * Enrichit les product_template_variant_value_ids de chaque variante avec les détails des attributs
   * Transforme les IDs en objets {id, name, attribute_id: {id, name, display_name}}
   */
  private async enrichVariantAttributeValues(variants: OdooProductVariant[]): Promise<void> {
    // Collecter tous les IDs de valeurs d'attributs
    const allValueIds: number[] = []
    for (const variant of variants) {
      if (Array.isArray(variant.product_template_variant_value_ids)) {
        // Si ce sont des IDs (nombres), on les collecte
        const ids = variant.product_template_variant_value_ids.filter(
          (v: any) => typeof v === 'number'
        ) as unknown as number[]
        allValueIds.push(...ids)
      }
    }

    if (allValueIds.length === 0) return

    const ids = [...new Set(allValueIds)]

    // Récupérer les détails des valeurs d'attributs (robuste selon version Odoo)
    // Certaines instances n'ont pas `product_attribute_value_id` => retry sans ce champ.
    let valueDetails: any[]
    try {
      valueDetails = await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid!,
          this.options.apiKey,
          "product.template.attribute.value",
          "read",
          [ids],
          {
            fields: ["name", "attribute_id", "product_attribute_value_id"],
          },
        ],
      })
    } catch (error: any) {
      const msg = `${error?.message || error}`.toLowerCase()
      if (
        msg.includes("unknown field") ||
        msg.includes("invalid field") ||
        msg.includes("does not exist") ||
        msg.includes("product_attribute_value_id")
      ) {
        console.warn(
          "⚠️ [ODOO] Champ product_attribute_value_id indisponible, retry sans ce champ"
        )
        valueDetails = await this.client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            this.options.dbName,
            this.uid!,
            this.options.apiKey,
            "product.template.attribute.value",
            "read",
            [ids],
            {
              fields: ["name", "attribute_id"],
            },
          ],
        })
      } else {
        throw error
      }
    }

    // Créer une map pour accès rapide
    const valueMap = new Map<number, any>()
    for (const value of valueDetails) {
      valueMap.set(value.id, {
        id: value.id,
        name: value.product_attribute_value_id?.[1] || value.name || 'Valeur',
        attribute_id: {
          id: value.attribute_id?.[0] || 0,
          name: value.attribute_id?.[1] || 'Attribut',
          display_name: value.attribute_id?.[1] || 'Attribut',
        }
      })
    }

    // Remplacer les IDs par les objets enrichis dans chaque variante
    for (const variant of variants) {
      if (Array.isArray(variant.product_template_variant_value_ids)) {
        variant.product_template_variant_value_ids = variant.product_template_variant_value_ids
          .map((v: any) => {
            if (typeof v === 'number') {
              return valueMap.get(v) || { id: v, name: 'Valeur', attribute_id: { id: 0, name: 'Attribut', display_name: 'Attribut' } }
            }
            return v
          })
      }
    }
  }

  /**
   * Récupérer toutes les catégories de produits internes
   */
  async fetchCategories(): Promise<OdooCategory[]> {
    if (!this.uid) {
      await this.login()
    }

    const categoryIds: number[] = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid!,
        this.options.apiKey,
        "product.category", // Utiliser 'product.public.category' pour les catégories e-commerce si préféré
        "search",
        [[]], // Pas de filtre, tout récupérer
      ],
    })

    if (!categoryIds.length) {
      return []
    }

    const categories: OdooCategory[] = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid!,
        this.options.apiKey,
        "product.category",
        "read",
        [categoryIds],
        {
          fields: ["name", "parent_id"],
        },
      ],
    })

    return categories
  }

  // ... rest of the class

  private options: Options
  private client: any
  private uid?: number

  constructor({}, options: Options) {
    this.options = options

    this.client = new JSONRPCClient((jsonRPCRequest) => {
      return fetch(`${options.url}/jsonrpc`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(jsonRPCRequest),
      }).then((response) => {
        if (response.status === 200) {
          return response
            .json()
            .then((jsonRPCResponse) => this.client.receive(jsonRPCResponse))
        } else if (jsonRPCRequest.id !== undefined) {
          return Promise.reject(new Error(response.statusText))
        }
      })
    })
  }

  async login() {
    console.log(`[ODOO] Authentification sur ${this.options.url} (db: ${this.options.dbName}, user: ${this.options.username})...`)
    const result = await this.client.request("call", {
      service: "common",
      method: "authenticate",
      args: [
        this.options.dbName,
        this.options.username,
        this.options.apiKey,
        {},
      ],
    })

    if (!result || result === false) {
      throw new Error(
        `[ODOO] Authentification échouée (uid=${result}). ` +
        `Vérifiez ODOO_URL, ODOO_DB_NAME, ODOO_USERNAME, ODOO_API_KEY.`
      )
    }

    this.uid = result
    console.log(`[ODOO] Authentifié avec succès (uid=${this.uid})`)
  }

  /**
   * Ping Odoo to verify connection and authentication
   * @returns Object with ok status, uid, and database name
   */
  async ping(): Promise<{ ok: boolean; uid: number; db: string; url: string }> {
    if (!this.uid) {
      await this.login()
    }
    return {
      ok: true,
      uid: this.uid!,
      db: this.options.dbName,
      url: this.options.url,
    }
  }

  /**
   * Update stock quantity in Odoo for a product variant
   * @param variantSku - SKU of the variant (ou format "ODOO-{id}")
   * @param quantity - New quantity
   */
  async updateStock(variantSku: string, quantity: number): Promise<void> {
    if (!this.uid) {
      await this.login()
    }

    let productId: number
    
    // Si le SKU est généré (format ODOO-{id}), utiliser directement l'ID
    if (variantSku.startsWith('ODOO-')) {
      const odooId = parseInt(variantSku.replace('ODOO-', ''))
      if (isNaN(odooId)) {
        throw new Error(`Invalid generated SKU format: ${variantSku}`)
      }
      productId = odooId
    } else {
      // Find product.product by SKU (default_code in Odoo)
      const productIds: number[] = await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid,
          this.options.apiKey,
          "product.product",
          "search",
          [[["default_code", "=", variantSku]]],
          { limit: 1 },
        ],
      })

      if (!productIds.length) {
        throw new Error(`Product with SKU ${variantSku} not found in Odoo`)
      }

      productId = productIds[0]
    }

    // Update stock via stock.quant
    // Find or create stock.quant for the product
    await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid,
        this.options.apiKey,
        "stock.quant",
        "create",
        [
          {
            product_id: productId,
            location_id: 8, // Stock location (adjust based on your Odoo config)
            quantity: quantity,
          },
        ],
      ],
    })
  }

  /**
   * Create an order in Odoo from Medusa order data
   * @param orderData - Medusa order data
   * @returns Odoo order ID
   */
  /**
   * Récupère les images d'un produit depuis le modèle common.product.image.ept (module EPT)
   */
  async fetchProductImages(imageIds: number[]): Promise<Array<{ id: number; name: string; image: string; sequence: number }>> {
    if (!this.uid) {
      await this.login()
    }

    if (!imageIds || imageIds.length === 0) {
      return []
    }

    try {
      console.log(`📷 [ODOO] Récupération de ${imageIds.length} image(s) depuis 'common.product.image.ept'...`)
      const images = await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid!,
          this.options.apiKey,
          "common.product.image.ept", // Modèle EPT au lieu de product.image
          "read",
          [imageIds],
          { fields: ["name", "image", "sequence"] }, // Champ 'image' au lieu de 'image_1920'
        ],
      })
      console.log(`✅ [ODOO] ${images?.length || 0} image(s) récupérée(s)`)
      return images
    } catch (error: any) {
      console.error(`❌ [ODOO] Erreur récupération images:`, error.message)
      return []
    }
  }

  /**
   * Récupère le stock disponible d'un produit par son SKU
   * Si le SKU est au format "ODOO-{id}", utilise directement l'ID
   */
  async getStockBySku(sku: string): Promise<number | null> {
    if (!this.uid) {
      await this.login()
    }

    try {
      let productIds: number[] = []
      
      // Si le SKU est généré (format ODOO-{id}), utiliser directement l'ID
      if (sku.startsWith('ODOO-')) {
        const odooId = parseInt(sku.replace('ODOO-', ''))
        if (!isNaN(odooId)) {
          productIds = [odooId]
        }
      } else {
        // Rechercher le produit par SKU (default_code)
        productIds = await this.client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            this.options.dbName,
            this.uid,
            this.options.apiKey,
            "product.product",
            "search",
            [[["default_code", "=", sku]]],
            { limit: 1 },
          ],
        })
      }

      if (!productIds.length) {
        return null
      }

      // Récupérer les détails du produit incluant le stock
      const products: any[] = await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid,
          this.options.apiKey,
          "product.product",
          "read",
          [productIds],
          { fields: ["qty_available"] },
        ],
      })

      return products[0]?.qty_available || 0
    } catch (error) {
      console.error(`Erreur getStockBySku pour ${sku}:`, error)
      throw error
    }
  }

  /**
   * Cherche un produit de service par default_code. Le crée dans Odoo s'il n'existe pas.
   * Utilisé pour les lignes "Livraison" et "Remise" qui nécessitent un product_id.
   */
  private async ensureServiceProduct(
    defaultCode: string,
    name: string,
    productType: string = "service"
  ): Promise<number> {
    const ids: number[] = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid,
        this.options.apiKey,
        "product.product",
        "search",
        [[["default_code", "=", defaultCode]]],
        { limit: 1 },
      ],
    })

    if (ids.length > 0) {
      return ids[0]
    }

    console.log(`[ODOO] Produit "${defaultCode}" non trouvé, création automatique...`)
    const newId: number = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid,
        this.options.apiKey,
        "product.product",
        "create",
        [{
          name,
          default_code: defaultCode,
          type: productType,
          list_price: 0,
          sale_ok: true,
          purchase_ok: false,
        }],
      ],
    })
    console.log(`[ODOO] Produit "${defaultCode}" créé (id=${newId})`)
    return newId
  }

  async createOrder(orderData: {
    customerEmail: string
    customerName: string
    items: Array<{
      sku: string
      quantity: number
      price: number
      name: string
      isGiftCard?: boolean
    }>
    shippingCost?: number
    discountTotal?: number
    total: number
    shippingAddress?: {
      address_1?: string
      city?: string
      postal_code?: string
      country_code?: string
    }
    companyName?: string
    vatNumber?: string
  }): Promise<number> {
    if (!this.uid) {
      await this.login()
    }

    console.log(`[ODOO] createOrder: Début création commande pour ${orderData.customerEmail} (${orderData.items.length} article(s))`)

    // 1. Find or create customer (res.partner)
    let partnerIds: number[] = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid,
        this.options.apiKey,
        "res.partner",
        "search",
        [[["email", "=", orderData.customerEmail]]],
        { limit: 1 },
      ],
    })

    let partnerId: number

    if (partnerIds.length === 0) {
      // Create customer
      const partnerData: any = {
        name: orderData.companyName || orderData.customerName,
        email: orderData.customerEmail,
        street: orderData.shippingAddress?.address_1 || "",
        city: orderData.shippingAddress?.city || "",
        zip: orderData.shippingAddress?.postal_code || "",
      }

      // Si un numéro de TVA est fourni, l'ajouter au partenaire Odoo
      if (orderData.vatNumber) {
        partnerData.vat = orderData.vatNumber
        partnerData.is_company = true
        console.log(`[Odoo] 🏢 Création partenaire entreprise avec TVA: ${orderData.vatNumber}`)
      }

      // Si un nom de société est fourni séparément du nom du contact
      if (orderData.companyName && orderData.companyName !== orderData.customerName) {
        partnerData.name = orderData.companyName
        // On peut aussi créer un contact enfant pour la personne physique
        partnerData.child_ids = [[0, 0, {
          name: orderData.customerName,
          email: orderData.customerEmail,
          type: "contact",
        }]]
      }

      partnerId = await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid,
          this.options.apiKey,
          "res.partner",
          "create",
          [partnerData],
        ],
      })
    } else {
      partnerId = partnerIds[0]

      // Mettre à jour le partenaire existant avec le numéro de TVA si nouveau
      if (orderData.vatNumber) {
        try {
          await this.client.request("call", {
            service: "object",
            method: "execute_kw",
            args: [
              this.options.dbName,
              this.uid,
              this.options.apiKey,
              "res.partner",
              "write",
              [[partnerId], {
                vat: orderData.vatNumber,
                is_company: true,
                ...(orderData.companyName ? { name: orderData.companyName } : {}),
              }],
            ],
          })
          console.log(`[Odoo] 🏢 Partner ${partnerId} mis à jour avec TVA: ${orderData.vatNumber}`)
        } catch (error: any) {
          console.warn(`[Odoo] ⚠️ Impossible de mettre à jour le partner avec TVA: ${error.message}`)
        }
      }
    }

    // 2. Create order lines
    const orderLines = []
    for (const item of orderData.items) {
      let productId: number | null = null
      
      // Gérer les SKUs générés au format ODOO-{id}
      if (item.sku.startsWith('ODOO-')) {
        const odooId = parseInt(item.sku.replace('ODOO-', ''))
        if (!isNaN(odooId)) {
          const exists: number[] = await this.client.request("call", {
            service: "object", method: "execute_kw",
            args: [this.options.dbName, this.uid, this.options.apiKey,
              "product.product", "search", [[["id", "=", odooId]]],
              { limit: 1, context: { active_test: false } }],
          })
          if (exists.length > 0) productId = odooId
        }
      } else {
        // 1ère tentative : produits actifs uniquement
        const activeIds: number[] = await this.client.request("call", {
          service: "object", method: "execute_kw",
          args: [this.options.dbName, this.uid, this.options.apiKey,
            "product.product", "search", [[["default_code", "=", item.sku]]],
            { limit: 1 }],
        })
        if (activeIds.length > 0) {
          productId = activeIds[0]
        } else {
          // 2ème tentative (solution la moins destructive) : inclure les produits archivés
          const archivedIds: number[] = await this.client.request("call", {
            service: "object", method: "execute_kw",
            args: [this.options.dbName, this.uid, this.options.apiKey,
              "product.product", "search", [[["default_code", "=", item.sku]]],
              { limit: 1, context: { active_test: false } }],
          })
          if (archivedIds.length > 0) {
            productId = archivedIds[0]
            console.log(`[ODOO] ℹ️ Produit SKU=${item.sku} trouvé mais archivé dans Odoo (id=${productId}) — inclus dans la commande`)
          }
        }
      }

      if (productId) {
        const priceUnit = item.isGiftCard ? item.price / 100 : item.price
        console.log(`📦 [ODOO] Ligne article: SKU=${item.sku}, raw_price=${item.price}, isGC=${!!item.isGiftCard}, price_unit_odoo=${priceUnit}, qty=${item.quantity}`)
        orderLines.push([0, 0, {
          product_id: productId,
          product_uom_qty: item.quantity,
          price_unit: priceUnit,
          name: item.name,
        }])
      } else {
        console.warn(`[ODOO] Produit non trouvé pour SKU: ${item.sku} (ni actif ni archivé)`)
      }
    }

    // Ajouter la ligne de livraison si shippingCost > 0
    if (orderData.shippingCost && orderData.shippingCost > 0) {
      const deliveryProductId = await this.ensureServiceProduct(
        "DELIVERY",
        "Frais de livraison (Medusa)",
        "service"
      )
      orderLines.push([0, 0, {
        product_id: deliveryProductId,
        product_uom_qty: 1,
        price_unit: orderData.shippingCost,
        name: "Frais de livraison",
      }])
      console.log(`🚚 [ODOO] Ligne livraison: ${orderData.shippingCost}€ (product_id=${deliveryProductId})`)
    }

    // Ajouter une ligne de remise si discountTotal > 0
    if (orderData.discountTotal && orderData.discountTotal > 0) {
      const discountProductId = await this.ensureServiceProduct(
        "DISCOUNT",
        "Réduction / Code promo (Medusa)",
        "service"
      )
      orderLines.push([0, 0, {
        product_id: discountProductId,
        product_uom_qty: 1,
        price_unit: -orderData.discountTotal,
        name: "Réduction / Code promo",
      }])
      console.log(`🏷️ [ODOO] Ligne remise: -${orderData.discountTotal}€ (product_id=${discountProductId})`)
    }

    if (orderLines.length === 0) {
      console.error(`[ODOO] createOrder: AUCUNE ligne de commande créée ! Tous les SKUs sont introuvables dans Odoo.`)
      console.error(`[ODOO] SKUs demandés: ${orderData.items.map(i => i.sku).join(', ')}`)
      throw new Error(`Aucun produit trouvé dans Odoo pour les SKUs: ${orderData.items.map(i => i.sku).join(', ')}`)
    }

    console.log(`[ODOO] createOrder: Création sale.order avec ${orderLines.length} ligne(s) pour partner ${partnerId}`)

    // 3. Create sale.order
    let orderId: number
    try {
      orderId = await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid,
          this.options.apiKey,
          "sale.order",
          "create",
          [
            {
              partner_id: partnerId,
              order_line: orderLines,
              note: "Order created from Medusa",
            },
          ],
        ],
      })
    } catch (createErr: any) {
      const errMsg = createErr?.data?.message || createErr?.message || String(createErr)
      console.error(`[ODOO] createOrder: Erreur création sale.order:`, errMsg)
      console.error(`[ODOO] Détails orderLines:`, JSON.stringify(orderLines, null, 2))
      throw new Error(`Odoo sale.order create failed: ${errMsg}`)
    }

    // 4. Confirm sale.order (Réserve le stock)
    try {
      await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid,
          this.options.apiKey,
          "sale.order",
          "action_confirm",
          [[orderId]],
        ],
      })
      console.log(`✅ [ODOO] Commande ${orderId} confirmée (Stock réservé)`)
    } catch (e) {
      console.warn(`⚠️ [ODOO] La commande ${orderId} a été créée mais la confirmation a échoué:`, e)
    }

    return orderId
  }

  async fetchProducts(
    pagination: Pagination = {}
  ): Promise<OdooProduct[]> {
    if (!this.uid) {
      await this.login()
    }

    const { offset = 0, limit = 10 } = pagination

    const productIds: number[] = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid,
        this.options.apiKey,
        "product.template",
        "search",
        [[]],
        {
          offset,
          limit,
        },
      ],
    })

    if (!productIds.length) {
      return []
    }

    const brandField = this.getBrandField()
    const fields = [
      "name",
      "display_name",
      "list_price",
      "default_code",
      "description_sale",
      "currency_id",
      "product_variant_ids",
      "product_variant_count",
      "attribute_line_ids",
      "qty_available",
      "categ_id",
      ...(brandField ? [brandField] : []),
    ]
    const products: OdooProduct[] = await this.safeReadProductTemplates(productIds, fields)

    for (const product of products) {
      // Enrichir les variantes — y compris les produits simples (1 variante)
      const rawVariantIds = Array.isArray(product.product_variant_ids)
        ? product.product_variant_ids.filter((v: any) => typeof v === "number")
        : []

      if (rawVariantIds.length > 0) {
        const variants: OdooProductVariant[] = await this.client.request(
          "call",
          {
            service: "object",
            method: "execute_kw",
            args: [
              this.options.dbName,
              this.uid,
              this.options.apiKey,
              "product.product",
              "read",
              [rawVariantIds],
              {
                fields: [
                  "display_name",
                  "list_price",
                  "lst_price",
                  "default_code",
                  "currency_id",
                  "product_template_variant_value_ids",
                  "weight",
                  "volume",
                  "barcode",
                  "image_512",
                  "qty_available",
                ],
              },
            ],
          }
        )

        // Enrichir les attributs des variantes (utile uniquement pour multi-variantes)
        if (product.product_variant_count > 1) {
          await this.enrichVariantAttributeValues(variants)
        }
        product.product_variant_ids = variants
      }

      if (product.attribute_line_ids?.length) {
        const attributeLines = await this.client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            this.options.dbName,
            this.uid,
            this.options.apiKey,
            "product.template.attribute.line",
            "read",
            [product.attribute_line_ids],
            {
              fields: ["attribute_id", "value_ids"],
            },
          ],
        })

        product.attribute_line_ids = attributeLines
      }
    }

    return products
  }

  /**
   * Récupère des produits spécifiques par leurs IDs
   */
  async fetchProductsByIds(productIds: number[]): Promise<OdooProduct[]> {
    if (!this.uid) {
      await this.login()
    }

    if (!productIds.length) {
      return []
    }

    const brandField = this.getBrandField()
    const fields = [
      "name",
      "display_name",
      "list_price",
      "default_code",
      "description_sale",
      "currency_id",
      "product_variant_ids",
      "product_variant_count",
      "attribute_line_ids",
      "qty_available",
      "image_512",
      "ept_image_ids",
      "weight",
      "volume",
      "categ_id",
      ...(brandField ? [brandField] : []),
    ]
    const products: OdooProduct[] = await this.safeReadProductTemplates(productIds, fields)

    // Enrichir les produits avec les variantes et attributs (même logique que fetchProductsPaged)
    for (const product of products) {
      // Enrichir les variantes — y compris les produits simples (1 variante)
      let rawVariantIds: number[] = Array.isArray(product.product_variant_ids)
        ? (product.product_variant_ids as any[]).filter((v: any) => typeof v === "number")
        : []

      // Si aucune variante visible, chercher les variantes archivées (active_test: false)
      if (rawVariantIds.length === 0) {
        try {
          const archivedVariantIds: number[] = await this.client.request(
            "call",
            {
              service: "object",
              method: "execute_kw",
              args: [
                this.options.dbName,
                this.uid!,
                this.options.apiKey,
                "product.product",
                "search",
                [[["product_tmpl_id", "=", product.id]]],
                { context: { active_test: false } },
              ],
            }
          )
          if (archivedVariantIds.length > 0) {
            console.log(`🔍 [ODOO] Produit ${product.id}: ${archivedVariantIds.length} variante(s) archivée(s) trouvée(s)`)
            rawVariantIds = archivedVariantIds as any
          }
        } catch (e: any) {
          console.warn(`⚠️ [ODOO] Erreur recherche variantes archivées pour ${product.id}:`, e.message)
        }
      }

      if (rawVariantIds.length > 0) {
        const variantFields = [
          "display_name",
          "list_price",
          "lst_price",
          "default_code",
          "currency_id",
          "product_template_variant_value_ids",
          "weight",
          "volume",
          "barcode",
          "image_512",
          "qty_available",
        ]

        let variants: OdooProductVariant[] = []
        try {
          // Tenter la lecture normale
          variants = await this.client.request(
            "call",
            {
              service: "object",
              method: "execute_kw",
              args: [
                this.options.dbName,
                this.uid!,
                this.options.apiKey,
                "product.product",
                "read",
                [rawVariantIds],
                { fields: variantFields },
              ],
            }
          )
        } catch (readErr: any) {
          // Si read échoue (variantes archivées), retenter avec active_test: false
          try {
            variants = await this.client.request(
              "call",
              {
                service: "object",
                method: "execute_kw",
                args: [
                  this.options.dbName,
                  this.uid!,
                  this.options.apiKey,
                  "product.product",
                  "search_read",
                  [[["id", "in", rawVariantIds]]],
                  { fields: variantFields, context: { active_test: false } },
                ],
              }
            )
          } catch (fallbackErr: any) {
            console.warn(`⚠️ [ODOO] Impossible de lire les variantes pour produit ${product.id}:`, fallbackErr.message)
          }
        }

        // Enrichir les attributs des variantes (utile uniquement pour multi-variantes)
        if (product.product_variant_count > 1 && variants.length > 0) {
          await this.enrichVariantAttributeValues(variants)
        }
        if (variants.length > 0) {
          product.product_variant_ids = variants
        }
      }

      if (product.attribute_line_ids?.length) {
        const attributeLines = await this.client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            this.options.dbName,
            this.uid!,
            this.options.apiKey,
            "product.template.attribute.line",
            "read",
            [product.attribute_line_ids],
            {
              fields: ["attribute_id", "value_ids"],
            },
          ],
        })

        for (const line of attributeLines) {
          if (line.value_ids?.length) {
            const values = await this.client.request("call", {
              service: "object",
              method: "execute_kw",
              args: [
                this.options.dbName,
                this.uid!,
                this.options.apiKey,
                "product.template.attribute.value",
                "read",
                [line.value_ids],
                {
                  fields: ["name", "attribute_id"],
                },
              ],
            })
            line.value_ids = values
          }
        }

        product.attribute_line_ids = attributeLines
      }
    }

    return products
  }

  /**
   * Récupère uniquement les IDs et dates de modification des produits
   * Utile pour détecter les produits modifiés dans Odoo
   */
  async fetchProductsWithDates(productIds: number[]): Promise<Array<{ id: number; write_date: string }>> {
    if (!this.uid) {
      await this.login()
    }

    if (!productIds.length) {
      return []
    }

    const products: Array<{ id: number; write_date: string }> = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid!,
        this.options.apiKey,
        "product.template",
        "read",
        [productIds],
        {
          fields: ["id", "write_date"], // Seulement ID et date de modification
        },
      ],
    })

    return products
  }

  async fetchProductsPaged(
    params: Pagination & { q?: string; categoryId?: number }
  ): Promise<{ products: OdooProduct[]; total: number }> {
    console.log(`[ODOO] fetchProductsPaged START: offset=${params?.offset}, limit=${params?.limit}, q=${params?.q}`)
    
    if (!this.uid) {
      console.log(`[ODOO] Logging in...`)
      await this.login()
    }

    const { offset = 0, limit = 10, q, categoryId } = params || {}

    let domain: any[] = []
    
    if (q && q.trim()) {
      const term = q.trim()
      // OR condition: name ILIKE term OR default_code ILIKE term
      domain.push("|", ["name", "ilike", term], ["default_code", "ilike", term])
    }

    if (categoryId) {
      // child_of permet de récupérer les produits de la catégorie ET de ses sous-catégories
      domain.push(["categ_id", "child_of", categoryId])
    }

    // Total count
    console.log(`[ODOO] Fetching total count with domain:`, domain)
    const total: number = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid!,
        this.options.apiKey,
        "product.template",
        "search_count",
        [domain],
      ],
    })
    console.log(`[ODOO] Total count: ${total}`)

    // Page of IDs
    console.log(`[ODOO] Fetching product IDs...`)
    const productIds: number[] = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid!,
        this.options.apiKey,
        "product.template",
        "search",
        [domain],
        {
          offset,
          limit,
        },
      ],
    })
    console.log(`[ODOO] Found ${productIds.length} product IDs:`, productIds)

    if (!productIds.length) {
      console.log(`[ODOO] No products found, returning empty`)
      return { products: [], total }
    }

    console.log(`[ODOO] Reading product templates...`)
    const brandField = this.getBrandField()
    const fields = [
      "name",
      "display_name",
      "list_price",
      "default_code",
      "description_sale",
      "currency_id",
      "product_variant_ids",
      "product_variant_count",
      "attribute_line_ids",
      "qty_available",
      "image_512",
      "ept_image_ids",
      "weight",
      "volume",
      "categ_id",
      ...(brandField ? [brandField] : []),
    ]
    const products: OdooProduct[] = await this.safeReadProductTemplates(productIds, fields)

    for (const product of products) {
      // Enrichir les variantes — y compris les produits simples (1 variante)
      let rawVariantIds: number[] = Array.isArray(product.product_variant_ids)
        ? (product.product_variant_ids as any[]).filter((v: any) => typeof v === "number")
        : []

      // Si aucune variante visible, chercher les variantes archivées (active_test: false)
      if (rawVariantIds.length === 0) {
        try {
          const archivedVariantIds: number[] = await this.client.request(
            "call",
            {
              service: "object",
              method: "execute_kw",
              args: [
                this.options.dbName,
                this.uid!,
                this.options.apiKey,
                "product.product",
                "search",
                [[["product_tmpl_id", "=", product.id]]],
                { context: { active_test: false } },
              ],
            }
          )
          if (archivedVariantIds.length > 0) {
            console.log(`🔍 [ODOO] fetchProductsPaged: Produit ${product.id}: ${archivedVariantIds.length} variante(s) archivée(s) trouvée(s)`)
            rawVariantIds = archivedVariantIds as any
          }
        } catch (e: any) {
          console.warn(`⚠️ [ODOO] fetchProductsPaged: Erreur recherche variantes archivées pour ${product.id}:`, e.message)
        }
      }

      if (rawVariantIds.length > 0) {
        const variantFields = [
          "display_name",
          "list_price",
          "lst_price",
          "default_code",
          "currency_id",
          "product_template_variant_value_ids",
          "weight",
          "volume",
          "barcode",
          "image_512",
          "qty_available",
        ]

        let variants: OdooProductVariant[] = []
        try {
          // Tenter la lecture normale
          variants = await this.client.request(
            "call",
            {
              service: "object",
              method: "execute_kw",
              args: [
                this.options.dbName,
                this.uid!,
                this.options.apiKey,
                "product.product",
                "read",
                [rawVariantIds],
                { fields: variantFields },
              ],
            }
          )
        } catch (readErr: any) {
          // Si read échoue (variantes archivées), retenter avec active_test: false
          try {
            variants = await this.client.request(
              "call",
              {
                service: "object",
                method: "execute_kw",
                args: [
                  this.options.dbName,
                  this.uid!,
                  this.options.apiKey,
                  "product.product",
                  "search_read",
                  [[["id", "in", rawVariantIds]]],
                  { fields: variantFields, context: { active_test: false } },
                ],
              }
            )
          } catch (fallbackErr: any) {
            console.warn(`⚠️ [ODOO] fetchProductsPaged: Impossible de lire les variantes pour produit ${product.id}:`, fallbackErr.message)
          }
        }

        // Enrichir les attributs des variantes (utile uniquement pour multi-variantes)
        if (product.product_variant_count > 1 && variants.length > 0) {
          await this.enrichVariantAttributeValues(variants)
        }
        if (variants.length > 0) {
          product.product_variant_ids = variants
        }
      }

      if (product.attribute_line_ids?.length) {
        const attributeLines = await this.client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            this.options.dbName,
            this.uid!,
            this.options.apiKey,
            "product.template.attribute.line",
            "read",
            [product.attribute_line_ids],
            {
              fields: ["attribute_id", "value_ids"],
            },
          ],
        })

        product.attribute_line_ids = attributeLines
      }
    }

    console.log(`[ODOO] fetchProductsPaged COMPLETE: returning ${products.length} products`)
    return { products, total }
  }
}

