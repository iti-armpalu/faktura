import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import type { ShopifyOrder } from './shopify.js'

const BANK_ACCOUNT = '2501853537/2010'
const IBAN = 'CZ1320100000002501853537'
const BIC = 'FIOBCZPPXXX'

function stripDiacritics(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function generateInvoiceNumber(order: ShopifyOrder): string {
    const year = new Date(order.created_at).getFullYear()
    const paddedNumber = String(order.order_number).padStart(6, '0')
    return `FV${year}${paddedNumber}`
}

function generateQrPlatbaString(order: ShopifyOrder, invoiceNumber: string): string {
    const amount = parseFloat(order.total_price).toFixed(2)
    const vs = String(order.order_number)
    return `SPD*1.0*ACC:${IBAN}+${BIC}*AM:${amount}*CC:CZK*VS:${vs}*MSG:${order.name}`
}

function getOrderSource(order: ShopifyOrder): string {
    switch (order.source_name) {
        case 'web': return 'Online store'
        case 'pos': return 'Point of Sale'
        case 'shopify_draft_orders': return 'Manual order'
        default: return 'Online store'
    }
}

export async function generateInvoicePdf(order: ShopifyOrder): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()

    const black = rgb(0, 0, 0)
    const gray = rgb(0.5, 0.5, 0.5)
    const lightGray = rgb(0.9, 0.9, 0.9)
    const teal = rgb(0.0, 0.53, 0.56)
    const white = rgb(1, 1, 1)

    const marginLeft = 50
    const marginRight = width - 50

    const invoiceNumber = generateInvoiceNumber(order)
    const issueDate = new Date(order.created_at)
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 14)

    const formatDate = (d: Date) =>
        d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' })

    // ── Order no & Invoice no header ─────────────────────────
    page.drawText(`Order no. ${order.name}`, {
        x: marginLeft, y: height - 40,
        size: 9, font: fontRegular, color: gray
    })

    page.drawText(`Invoice no. ${invoiceNumber}`, {
        x: marginRight - 180, y: height - 40,
        size: 14, font: fontBold, color: black
    })

    // ── Divider ──────────────────────────────────────────────
    page.drawLine({
        start: { x: marginLeft, y: height - 55 },
        end: { x: marginRight, y: height - 55 },
        thickness: 1, color: lightGray
    })

    // ── Supplier ─────────────────────────────────────────────
    page.drawText('Supplier', {
        x: marginLeft, y: height - 75,
        size: 9, font: fontBold, color: black
    })

    page.drawText('Anna Hora s.r.o.', {
        x: marginLeft, y: height - 92,
        size: 9, font: fontRegular, color: black
    })

    page.drawText('Jinonicka 804/80', {
        x: marginLeft, y: height - 105,
        size: 9, font: fontRegular, color: black
    })

    page.drawText('15800 Praha 5', {
        x: marginLeft, y: height - 118,
        size: 9, font: fontRegular, color: black
    })

    page.drawText('CZ', {
        x: marginLeft, y: height - 131,
        size: 9, font: fontRegular, color: black
    })

    page.drawText('Reg. No. 09373781', {
        x: marginLeft, y: height - 150,
        size: 9, font: fontRegular, color: black
    })

    page.drawText('Tax ID NonPayer tax', {
        x: marginLeft, y: height - 163,
        size: 9, font: fontRegular, color: black
    })

    page.drawText('Barbora@annahora.com', {
        x: marginLeft, y: height - 182,
        size: 9, font: fontRegular, color: black
    })

    page.drawText('Registered at: MSPH Mestsky soud v Praze, File No: C 335341', {
        x: marginLeft, y: height - 195,
        size: 8, font: fontRegular, color: black
    })

    page.drawText('Payment Method:', {
        x: marginLeft, y: height - 210,
        size: 8, font: fontRegular, color: gray
    })

    page.drawText('Bank transfer', {
        x: marginLeft, y: height - 222,
        size: 9, font: fontBold, color: black
    })

    page.drawText(`Order source: ${getOrderSource(order)}`, {
        x: marginLeft, y: height - 235,
        size: 8, font: fontRegular, color: gray
    })

    // ── ANNA HORA center text ─────────────────────────────────
    page.drawText('ANNA HORA', {
        x: 210, y: height - 140,
        size: 20, font: fontBold, color: rgb(0.7, 0.7, 0.7)
    })

    // ── Customer ─────────────────────────────────────────────
    const billingName = order.billing_address?.name || order.contact_email
    const billingAddress = order.billing_address

    page.drawText('Customer', {
        x: 340, y: height - 75,
        size: 9, font: fontBold, color: black
    })

    page.drawText(stripDiacritics(billingName), {
        x: 340, y: height - 92,
        size: 9, font: fontRegular, color: black
    })

    if (billingAddress) {
        page.drawText(stripDiacritics(billingAddress.address1 || ''), {
            x: 340, y: height - 105,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(stripDiacritics(`${billingAddress.zip || ''} ${billingAddress.city || ''}`), {
            x: 340, y: height - 118,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(stripDiacritics(billingAddress.country || ''), {
            x: 340, y: height - 131,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(stripDiacritics(order.contact_email || ''), {
            x: 340, y: height - 150,
            size: 9, font: fontRegular, color: black
        })
    }

    // ── Issue date & Tax date ────────────────────────────────
    page.drawText('Issue date', {
        x: 340, y: height - 175,
        size: 8, font: fontRegular, color: gray
    })

    page.drawText('Tax date', {
        x: 450, y: height - 175,
        size: 8, font: fontRegular, color: gray
    })

    page.drawText(formatDate(issueDate), {
        x: 340, y: height - 188,
        size: 9, font: fontRegular, color: black
    })

    page.drawText(formatDate(issueDate), {
        x: 450, y: height - 188,
        size: 9, font: fontRegular, color: black
    })

    // ── Bank details bar ─────────────────────────────────────
    const barY = height - 265
    page.drawRectangle({
        x: marginLeft, y: barY,
        width: width - 100, height: 35,
        color: lightGray
    })

    page.drawText(BANK_ACCOUNT, {
        x: marginLeft + 8, y: barY + 20,
        size: 9, font: fontBold, color: black
    })

    page.drawText(IBAN, {
        x: marginLeft + 8, y: barY + 8,
        size: 8, font: fontRegular, color: gray
    })

    page.drawText(BIC, {
        x: 220, y: barY + 8,
        size: 8, font: fontRegular, color: gray
    })

    page.drawText('Variable symbol', {
        x: 310, y: barY + 20,
        size: 7, font: fontRegular, color: gray
    })

    page.drawText(String(order.order_number), {
        x: 310, y: barY + 8,
        size: 9, font: fontBold, color: black
    })

    page.drawText('Due date', {
        x: 390, y: barY + 20,
        size: 7, font: fontRegular, color: gray
    })

    page.drawText(formatDate(dueDate), {
        x: 390, y: barY + 8,
        size: 9, font: fontRegular, color: black
    })

    // Amount due teal box
    page.drawRectangle({
        x: 460, y: barY,
        width: 85, height: 35,
        color: teal
    })

    page.drawText('Amount due', {
        x: 465, y: barY + 20,
        size: 7, font: fontRegular, color: white
    })

    page.drawText(`${parseFloat(order.total_price).toFixed(0)} CZK`, {
        x: 465, y: barY + 8,
        size: 9, font: fontBold, color: white
    })

    // ── Line items table ─────────────────────────────────────
    let y = height - 320

    page.drawText('Item', { x: marginLeft, y, size: 8, font: fontBold, color: black })
    page.drawText('Unit price', { x: 310, y, size: 8, font: fontBold, color: black })
    page.drawText('Qt', { x: 390, y, size: 8, font: fontBold, color: black })
    page.drawText('Unit', { x: 430, y, size: 8, font: fontBold, color: black })
    page.drawText('Amount', { x: 490, y, size: 8, font: fontBold, color: black })

    y -= 5

    page.drawLine({
        start: { x: marginLeft, y },
        end: { x: marginRight, y },
        thickness: 0.5, color: lightGray
    })

    y -= 15

    for (const item of order.line_items) {
        const itemTotal = parseFloat(item.price) * item.quantity

        page.drawText(stripDiacritics(item.title), {
            x: marginLeft, y,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(`${parseFloat(item.price).toFixed(2)}`, {
            x: 310, y,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(`${item.quantity}`, {
            x: 390, y,
            size: 9, font: fontRegular, color: black
        })

        page.drawText('ks', {
            x: 430, y,
            size: 9, font: fontRegular, color: black
        })

        page.drawText(`${itemTotal.toFixed(2)}`, {
            x: 490, y,
            size: 9, font: fontRegular, color: black
        })

        y -= 8

        page.drawLine({
            start: { x: marginLeft, y },
            end: { x: marginRight, y },
            thickness: 0.5, color: lightGray
        })

        y -= 15
    }

    // ── Totals ───────────────────────────────────────────────
    y -= 10

    page.drawText('Rounding', {
        x: 390, y,
        size: 9, font: fontRegular, color: black
    })

    page.drawText('0.00 CZK', {
        x: 490, y,
        size: 9, font: fontRegular, color: black
    })

    y -= 18

    page.drawText('Amount due', {
        x: 390, y,
        size: 10, font: fontBold, color: black
    })

    page.drawText(`${parseFloat(order.total_price).toFixed(2)} CZK`, {
        x: 470, y,
        size: 10, font: fontBold, color: black
    })

    y -= 18

    page.drawText('Issued by: Barbora Bazalova', {
        x: 390, y,
        size: 8, font: fontRegular, color: gray
    })

    // ── QR Platba ────────────────────────────────────────────
    const qrString = generateQrPlatbaString(order, invoiceNumber)
    const qrDataUrl = await QRCode.toDataURL(qrString, { width: 120, margin: 1 })
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
    const qrImage = await pdfDoc.embedPng(qrImageBytes)

    page.drawImage(qrImage, {
        x: marginLeft, y: 60,
        width: 90, height: 90
    })

    page.drawText('QR Platba+F', {
        x: marginLeft, y: 52,
        size: 7, font: fontRegular, color: gray
    })

    return pdfDoc.save()
}