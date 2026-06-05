import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { ShopifyOrder } from './shopify.js'

export async function generateInvoicePdf(order: ShopifyOrder): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()

    const black = rgb(0, 0, 0)
    const gray = rgb(0.5, 0.5, 0.5)
    const lightGray = rgb(0.9, 0.9, 0.9)

    const marginLeft = 50
    const marginRight = width - 50

    // Header
    page.drawText('ANNA HORA', {
        x: marginLeft, y: height - 60,
        size: 22, font: fontBold, color: black
    })

    page.drawText('Danovy doklad', {
        x: marginRight - 120, y: height - 50,
        size: 16, font: fontBold, color: black
    })

    // Invoice number & dates
    const issueDate = new Date(order.created_at)
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 14)

    const formatDate = (d: Date) =>
        d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' })

    page.drawText(`Faktura: ${order.name}`, {
        x: marginRight - 200, y: height - 75,
        size: 10, font: fontRegular, color: black
    })

    page.drawText(`Datum: ${formatDate(issueDate)}`, {
        x: marginRight - 200, y: height - 90,
        size: 10, font: fontRegular, color: black
    })

    page.drawText(`Splatnost: ${formatDate(dueDate)}`, {
        x: marginRight - 200, y: height - 105,
        size: 10, font: fontRegular, color: black
    })

    page.drawText(`Var. symbol: ${order.order_number}`, {
        x: marginRight - 200, y: height - 120,
        size: 10, font: fontRegular, color: black
    })

    // Divider
    page.drawLine({
        start: { x: marginLeft, y: height - 135 },
        end: { x: marginRight, y: height - 135 },
        thickness: 1, color: lightGray
    })

    // Supplier
    page.drawText('Dodavatel', {
        x: marginLeft, y: height - 155,
        size: 9, font: fontBold, color: gray
    })

    page.drawText('Anna Hora s.r.o.', {
        x: marginLeft, y: height - 170,
        size: 10, font: fontBold, color: black
    })

    page.drawText('Neplatce DPH', {
        x: marginLeft, y: height - 185,
        size: 9, font: fontRegular, color: gray
    })

    // Customer
    page.drawText('Odberatel', {
        x: 300, y: height - 155,
        size: 9, font: fontBold, color: gray
    })

    const billingName = order.billing_address?.name || order.contact_email
    const billingAddress = order.billing_address

    page.drawText(billingName, {
        x: 300, y: height - 170,
        size: 10, font: fontBold, color: black
    })

    if (billingAddress) {
        page.drawText(billingAddress.address1 || '', {
            x: 300, y: height - 185,
            size: 10, font: fontRegular, color: black
        })

        page.drawText(`${billingAddress.zip || ''} ${billingAddress.city || ''}`, {
            x: 300, y: height - 200,
            size: 10, font: fontRegular, color: black
        })

        page.drawText(billingAddress.country || '', {
            x: 300, y: height - 215,
            size: 10, font: fontRegular, color: black
        })
    }

    // Line items table
    let y = height - 270

    page.drawRectangle({
        x: marginLeft, y: y - 5,
        width: width - 100, height: 20,
        color: lightGray
    })

    page.drawText('Popis', { x: marginLeft + 5, y, size: 9, font: fontBold, color: black })
    page.drawText('Mnozstvi', { x: 350, y, size: 9, font: fontBold, color: black })
    page.drawText('Cena/ks', { x: 420, y, size: 9, font: fontBold, color: black })
    page.drawText('Celkem', { x: 490, y, size: 9, font: fontBold, color: black })

    y -= 25

    for (const item of order.line_items) {
        const itemTotal = parseFloat(item.price) * item.quantity

        page.drawText(item.title, {
            x: marginLeft + 5, y,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(`${item.quantity} ks`, {
            x: 350, y,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(`${parseFloat(item.price).toFixed(2)} Kc`, {
            x: 420, y,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(`${itemTotal.toFixed(2)} Kc`, {
            x: 490, y,
            size: 9, font: fontRegular, color: black
        })

        y -= 20

        page.drawLine({
            start: { x: marginLeft, y: y + 5 },
            end: { x: marginRight, y: y + 5 },
            thickness: 0.5, color: lightGray
        })
    }

    // Total
    y -= 10

    page.drawLine({
        start: { x: marginLeft, y: y + 5 },
        end: { x: marginRight, y: y + 5 },
        thickness: 1, color: black
    })

    y -= 15

    page.drawText('Celkem k uhrade:', {
        x: 380, y,
        size: 12, font: fontBold, color: black
    })

    page.drawText(`${parseFloat(order.total_price).toFixed(2)} Kc`, {
        x: 490, y,
        size: 12, font: fontBold, color: black
    })

    // Footer
    page.drawText('Faktura vystavena neplatcem DPH. DPH se neuplatňuje.', {
        x: marginLeft, y: 60,
        size: 8, font: fontRegular, color: gray
    })

    return pdfDoc.save()
}