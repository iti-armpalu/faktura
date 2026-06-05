import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { getOrder, getInvoiceMetafields, saveInvoiceMetafields } from './shopify.js'
import { generateInvoicePdf } from './invoice.js'

const app = new Hono()

app.use('*', cors())

app.get('/health', (c) => {
    return c.json({ status: 'ok', app: 'faktura' })
})

// Check if invoice exists for an order
app.get('/invoices/order/:orderId', async (c) => {
    const orderId = c.req.param('orderId')

    try {
        const metafields = await getInvoiceMetafields(orderId)

        if (metafields.length === 0) {
            return c.json({ invoice: null })
        }

        const invoice = {
            invoiceNumber: metafields.find(m => m.key === 'invoice_number')?.value,
            createdAt: metafields.find(m => m.key === 'created_at')?.value,
        }

        return c.json({ invoice })
    } catch (error) {
        console.error('Error fetching invoice:', error)
        return c.json({ error: 'Failed to fetch invoice' }, 500)
    }
})

// Create invoice for an order
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
        console.log(`Creating invoice for order ${order.name}`)

        // Save metafields
        await saveInvoiceMetafields(orderId, {
            invoiceNumber: order.name,
            createdAt: new Date().toISOString()
        })

        return c.json({ invoiceNumber: order.name })
    } catch (error) {
        console.error('Error creating invoice:', error)
        return c.json({ error: 'Failed to create invoice' }, 500)
    }
})

// Download PDF for an order
app.get('/invoices/order/:orderId/pdf', async (c) => {
    const orderId = c.req.param('orderId')

    try {
        const order = await getOrder(orderId)
        const pdfBytes = await generateInvoicePdf(order)

        return new Response(Buffer.from(pdfBytes), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="faktura-${order.name}.pdf"`
            }
        })
    } catch (error) {
        console.error('Error generating PDF:', error)
        return c.json({ error: 'Failed to generate PDF' }, 500)
    }
})

const port = process.env.PORT || 3000
console.log(`Faktura backend running on port ${port}`)

serve({
    fetch: app.fetch,
    port: Number(port)
})