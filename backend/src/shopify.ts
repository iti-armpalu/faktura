import 'dotenv/config'

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!
const API_VERSION = '2026-04'

const baseUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}`

const headers = {
    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json'
}

export async function getOrder(orderId: string) {
    const response = await fetch(`${baseUrl}/orders/${orderId}.json`, { headers })

    if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as { order: ShopifyOrder }
    return data.order
}

export async function saveInvoiceMetafields(orderId: string, invoice: {
    invoiceNumber: string
    createdAt: string
}) {
    const metafields = [
        { namespace: 'faktura', key: 'invoice_number', value: invoice.invoiceNumber, type: 'single_line_text_field' },
        { namespace: 'faktura', key: 'created_at', value: invoice.createdAt, type: 'single_line_text_field' },
    ]

    for (const metafield of metafields) {
        const response = await fetch(`${baseUrl}/orders/${orderId}/metafields.json`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ metafield })
        })

        if (!response.ok) {
            throw new Error(`Failed to save metafield ${metafield.key}: ${response.status}`)
        }
    }
}

export async function getInvoiceMetafields(orderId: string) {
    const response = await fetch(
        `${baseUrl}/orders/${orderId}/metafields.json?namespace=faktura`,
        { headers }
    )

    if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`)
    }

    const data = await response.json() as { metafields: ShopifyMetafield[] }
    return data.metafields
}

// Types
export interface ShopifyOrder {
    id: number
    name: string
    order_number: number
    created_at: string
    currency: string
    total_price: string
    payment_gateway: string
    billing_address: {
        name: string
        address1: string
        address2: string | null
        city: string
        zip: string
        country: string
        company: string | null
    }
    line_items: {
        id: number
        title: string
        quantity: number
        price: string
    }[]
    note: string | null
    contact_email: string
}

export interface ShopifyMetafield {
    id: number
    namespace: string
    key: string
    value: string
}