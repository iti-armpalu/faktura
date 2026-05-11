import "@shopify/ui-extensions/preact";
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const BACKEND_URL = 'https://invoice-panel-production.up.railway.app'

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const { data } = shopify;
  const orderId = data.selected[0]?.id

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderId) return
    fetchInvoice()
  }, [orderId])

  async function fetchInvoice() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${BACKEND_URL}/invoices/order/${orderId}`)
      const data = await res.json()
      setInvoice(data.invoice)
    } catch (err) {
      setError('Failed to load invoice status')
    } finally {
      setLoading(false)
    }
  }

  async function createInvoice() {
    try {
      setCreating(true)
      setError(null)
      const res = await fetch(`${BACKEND_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create invoice')
      await fetchInvoice()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <s-admin-block heading="Faktura">
        <s-text>Loading...</s-text>
      </s-admin-block>
    )
  }

  return (
    <s-admin-block heading="Faktura">
      <s-stack direction="block" gap="base">

        {error && (
          <s-banner tone="critical">
            <s-text>{error}</s-text>
          </s-banner>
        )}

        {!invoice ? (
          <s-stack direction="block" gap="base">
            <s-text>No invoice created yet for this order.</s-text>
            <s-button
              variant="primary"
              onClick={createInvoice}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Invoice'}
            </s-button>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            <s-text type="strong">Invoice: {invoice.invoiceNumber}</s-text>
            <s-text>Created: {new Date(invoice.createdAt).toLocaleDateString('cs-CZ')}</s-text>
            <s-button
              variant="primary"
              onClick={() => window.open(invoice.pdfUrl, '_blank')}
            >
              Download PDF
            </s-button>
          </s-stack>
        )}

      </s-stack>
    </s-admin-block>
  )
}