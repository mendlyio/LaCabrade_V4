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
  name: string
  display_name: string
  list_price: number
  default_code: string
  description_sale: string
  currency_id: {
    id: number
    display_name: string
  }
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
  display_name: string
  list_price: number
  code: string
  currency_id: {
    id: number
    display_name: string
  }
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
  private client: JSONRPCClient
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
}

