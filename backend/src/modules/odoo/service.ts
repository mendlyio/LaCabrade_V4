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
  weight?: number
  volume?: number
  currency_id: any // Peut être [id, name] ou {id, display_name}
  product_variant_ids: OdooProductVariant[]
  product_variant_count: number
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
  code?: string
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

export default class OdooModuleService {
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
    this.uid = await this.client.request("call", {
      service: "common",
      method: "authenticate",
      args: [
        this.options.dbName,
        this.options.username,
        this.options.apiKey,
        {},
      ],
    })
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

  async createOrder(orderData: {
    customerEmail: string
    customerName: string
    items: Array<{
      sku: string
      quantity: number
      price: number
      name: string
    }>
    total: number
    shippingAddress?: {
      address_1?: string
      city?: string
      postal_code?: string
      country_code?: string
    }
  }): Promise<number> {
    if (!this.uid) {
      await this.login()
    }

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
      partnerId = await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid,
          this.options.apiKey,
          "res.partner",
          "create",
          [
            {
              name: orderData.customerName,
              email: orderData.customerEmail,
              street: orderData.shippingAddress?.address_1 || "",
              city: orderData.shippingAddress?.city || "",
              zip: orderData.shippingAddress?.postal_code || "",
            },
          ],
        ],
      })
    } else {
      partnerId = partnerIds[0]
    }

    // 2. Create order lines
    const orderLines = []
    for (const item of orderData.items) {
      // Find product by SKU
      const productIds: number[] = await this.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          this.options.dbName,
          this.uid,
          this.options.apiKey,
          "product.product",
          "search",
          [[["default_code", "=", item.sku]]],
          { limit: 1 },
        ],
      })

      if (productIds.length > 0) {
        orderLines.push([
          0,
          0,
          {
            product_id: productIds[0],
            product_uom_qty: item.quantity,
            price_unit: item.price / 100, // Medusa uses cents
            name: item.name,
          },
        ])
      }
    }

    // 3. Create sale.order
    const orderId: number = await this.client.request("call", {
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

    const products: OdooProduct[] = await this.client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        this.options.dbName,
        this.uid,
        this.options.apiKey,
        "product.template",
        "read",
        [productIds],
        {
          fields: [
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
          ],
        },
      ],
    })

    for (const product of products) {
      if (product.product_variant_count > 1) {
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
              [product.product_variant_ids],
              {
                fields: [
                  "display_name",
                  "list_price",
                  "code",
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

    const products: OdooProduct[] = await this.client.request("call", {
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
          fields: [
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
            "weight",
            "volume",
          ],
        },
      ],
    })

    // Enrichir les produits avec les variantes et attributs (même logique que fetchProductsPaged)
    for (const product of products) {
      if (product.product_variant_count > 1) {
        const variants: OdooProductVariant[] = await this.client.request(
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
              [product.product_variant_ids],
              {
                fields: [
                  "display_name",
                  "list_price",
                  "code",
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

        product.product_variant_ids = variants
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
    params: Pagination & { q?: string }
  ): Promise<{ products: OdooProduct[]; total: number }> {
    if (!this.uid) {
      await this.login()
    }

    const { offset = 0, limit = 10, q } = params || {}

    let domain: any[] = []
    if (q && q.trim()) {
      const term = q.trim()
      // OR condition: name ILIKE term OR default_code ILIKE term
      domain = ["|", ["name", "ilike", term], ["default_code", "ilike", term]]
    }

    // Total count
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

    // Page of IDs
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

    if (!productIds.length) {
      return { products: [], total }
    }

    const products: OdooProduct[] = await this.client.request("call", {
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
          fields: [
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
            "weight",
            "volume",
          ],
        },
      ],
    })

    for (const product of products) {
      if (product.product_variant_count > 1) {
        const variants: OdooProductVariant[] = await this.client.request(
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
              [product.product_variant_ids],
              {
                fields: [
                  "display_name",
                  "list_price",
                  "code",
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

        product.product_variant_ids = variants
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

    return { products, total }
  }
}

