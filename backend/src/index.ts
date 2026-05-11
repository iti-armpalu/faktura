import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { getOrder, getInvoiceMetafields } from './shopify.js'

const app = new Hono()

app.use('*', cors())

app.get('/health', (c) => {
    return c.json({ status: 'ok', app: 'faktura' })
})

app.get('/invoices/order/:orderId', async (c) => {
    const orderId = c.req.param('orderId')

    try {
        const metafields = await getInvoiceMetafields(orderId)

        if (metafields.length === 0) {
            return c.json({ invoice: null })
        }

        const invoice = {
            triviId: metafields.find(m => m.key === 'trivi_invoice_id')?.value,
            invoiceNumber: metafields.find(m => m.key === 'trivi_invoice_number')?.value,
            pdfUrl: metafields.find(m => m.key === 'trivi_invoice_pdf_url')?.value,
            createdAt: metafields.find(m => m.key === 'trivi_created_at')?.value,
        }

        return c.json({ invoice })
    } catch (error) {
        console.error('Error fetching invoice:', error)
        return c.json({ error: 'Failed to fetch invoice' }, 500)
    }
})

app.post('/invoices', async (c) => {
    const body = await c.req.json() as { orderId: string }
    const { orderId } = body

    if (!orderId) {
        return c.json({ error: 'orderId is required' }, 400)
    }

    try {
        // Check if invoice already exists
        const existing = await getInvoiceMetafields(orderId)
        if (existing.length > 0) {
            return c.json({ error: 'Invoice already exists for this order' }, 409)
        }

        // Fetch order from Shopify
        const order = await getOrder(orderId)
        console.log(`Creating invoice for order #${order.order_number}`)

        // TODO: create invoice in Trivi
        // TODO: save metafields

        return c.json({ message: 'Trivi integration pending', order: order.order_number }, 501)
    } catch (error) {
        console.error('Error creating invoice:', error)
        return c.json({ error: 'Failed to create invoice' }, 500)
    }
})

const port = process.env.PORT || 3000
console.log(`Faktura backend running on port ${port}`)

serve({
    fetch: app.fetch,
    port: Number(port)
})