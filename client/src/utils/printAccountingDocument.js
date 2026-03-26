import { contactContent } from '../data/siteContent.js';
import { formatCurrency, formatDate } from './formatters.js';

const DEFAULT_FOOTER_TERMS = [
  'Payment is due on or before the due date stated on this document unless otherwise agreed in writing by TriCore Events.',
  'Amounts paid for confirmed event allocations, sponsorship inventory, or completed services are non-refundable except where TriCore approves a documented exception.',
  "TriCore Events' liability is limited to the value of the billed service or sponsorship item and does not extend to indirect, incidental, or consequential losses.",
  "This document and any related commercial arrangement are governed by the applicable laws and jurisdiction connected to TriCore Events' operating entity in India."
];

const DEFAULT_INVOICE_CONFIG = {
  companyName: 'TriCore Events',
  companyEmail: contactContent.email,
  companyWebsite: contactContent.website,
  companyLogoUrl: '/tricore-mark.svg',
  defaultTaxLabel: 'GST',
  paymentTermsLabel: 'Due within 15 days from invoice date.',
  footerNotes: 'Sarva Horizon is the Event Partner.',
  footerTerms: DEFAULT_FOOTER_TERMS.join('\n'),
  defaultTemplateStyle: 'modern'
};

const TEMPLATE_THEMES = {
  modern: {
    heroGradient: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #fff7ed 100%)',
    accentGradient: 'linear-gradient(90deg, #0f5fdb 0%, #2563eb 45%, #f97316 100%)',
    noteGradient: 'linear-gradient(90deg, #eff6ff 0%, #fff7ed 100%)',
    sectionAccent: '#0f5fdb'
  },
  classic: {
    heroGradient: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 58%, #f1f5f9 100%)',
    accentGradient: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #f97316 100%)',
    noteGradient: 'linear-gradient(90deg, #f8fafc 0%, #fff7ed 100%)',
    sectionAccent: '#1e293b'
  },
  executive: {
    heroGradient: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #fef3c7 100%)',
    accentGradient: 'linear-gradient(90deg, #0a2c66 0%, #0f5fdb 50%, #f59e0b 100%)',
    noteGradient: 'linear-gradient(90deg, #dbeafe 0%, #fef3c7 100%)',
    sectionAccent: '#0a2c66'
  }
};

const getDocumentLabel = (transaction) =>
  transaction.type === 'expense' ? 'Vendor Bill' : 'Invoice';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatOptionalDate = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return formatDate(parsed);
};

const addDaysToDateValue = (value, days = 0) => {
  if (!value) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  parsed.setUTCDate(parsed.getUTCDate() + Number(days || 0));
  return parsed;
};

const resolveAssetUrl = (value) => {
  const normalized = String(value || '').trim();

  if (!normalized || typeof window === 'undefined') {
    return normalized;
  }

  if (/^(https?:|data:)/i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('/')) {
    return `${window.location.origin}${normalized}`;
  }

  return normalized;
};

const buildEffectiveInvoiceConfig = (invoiceConfig = {}) => ({
  ...DEFAULT_INVOICE_CONFIG,
  ...invoiceConfig,
  companyLogoUrl: resolveAssetUrl(invoiceConfig.companyLogoUrl || DEFAULT_INVOICE_CONFIG.companyLogoUrl)
});

const getInvoiceMeta = (transaction, invoiceConfig) => {
  const invoiceDetails = transaction.invoiceDetails || {};
  const subtotal = Number(invoiceDetails.subtotal || transaction.amount || 0);
  const taxAmount = Number(invoiceDetails.taxAmount || 0);
  const total = Number(invoiceDetails.total || subtotal + taxAmount);
  const itemDescription =
    invoiceDetails.itemDescription ||
    transaction.notes ||
    transaction.reference ||
    'Accounting service line item';
  const taxLabel =
    invoiceDetails.taxLabel ||
    (taxAmount > 0 ? invoiceConfig.defaultTaxLabel || 'GST' : '');

  return {
    documentNumber:
      invoiceDetails.documentNumber ||
      transaction.referenceDocument ||
      `TRI-${String(transaction._id || transaction.reference || 'DOC')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(-10)
        .toUpperCase()}`,
    issueDate: invoiceDetails.issueDate || transaction.date,
    dueDate:
      invoiceDetails.dueDate ||
      addDaysToDateValue(invoiceDetails.issueDate || transaction.date, invoiceConfig.paymentTermsDays || 0),
    billToName: invoiceDetails.billToName || transaction.reference || '-',
    billToCompany: invoiceDetails.billToCompany || '',
    billToEmail: invoiceDetails.billToEmail || '',
    billToPhone: invoiceDetails.billToPhone || '',
    billingAddress: invoiceDetails.billingAddress || '',
    itemDescription,
    taxLabel,
    taxRate: invoiceDetails.taxRate || 0,
    taxAmount,
    subtotal,
    total
  };
};

const buildBillingLines = (meta) =>
  [
    meta.billToName,
    meta.billToCompany,
    meta.billToEmail,
    meta.billToPhone,
    meta.billingAddress
  ].filter(Boolean);

const getTemplateTheme = (style) =>
  TEMPLATE_THEMES[String(style || '').trim().toLowerCase()] || TEMPLATE_THEMES.modern;

const buildFooterTerms = (footerTerms) => {
  const normalizedTerms = String(footerTerms || '')
    .split('\n')
    .map((term) => term.trim())
    .filter(Boolean);

  return normalizedTerms.length ? normalizedTerms : DEFAULT_FOOTER_TERMS;
};

export const printAccountingDocument = (transaction, invoiceConfig = {}) => {
  if (typeof window === 'undefined' || !transaction) {
    return;
  }

  const effectiveInvoiceConfig = buildEffectiveInvoiceConfig(invoiceConfig);
  const templateTheme = getTemplateTheme(effectiveInvoiceConfig.defaultTemplateStyle);
  const footerTerms = buildFooterTerms(effectiveInvoiceConfig.footerTerms);
  const documentLabel = getDocumentLabel(transaction);
  const eventName =
    transaction.scope === 'common'
      ? 'Common Ledger'
      : transaction.eventId?.name || 'TriCore Event';
  const meta = getInvoiceMeta(transaction, effectiveInvoiceConfig);
  const billingLines = buildBillingLines(meta);
  const notes = transaction.notes || 'No additional notes supplied.';
  const taxSummary =
    meta.taxAmount > 0
      ? `${escapeHtml(meta.taxLabel || 'Tax')} (${escapeHtml(meta.taxRate)}%)`
      : 'No tax applied';
  const categoryLabel = transaction.categoryLabel || transaction.category || '-';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentLabel)} - ${escapeHtml(meta.documentNumber)}</title>
        <style>
          @page { margin: 18mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
          }
          .document {
            max-width: 960px;
            margin: 0 auto;
            padding: 22px 8px 28px;
          }
          .hero {
            border: 1px solid #dbe4f0;
            border-radius: 28px;
            overflow: hidden;
            background: ${templateTheme.heroGradient};
          }
          .hero-band {
            height: 14px;
            background: ${templateTheme.accentGradient};
          }
          .hero-content {
            display: grid;
            grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.9fr);
            gap: 28px;
            padding: 28px;
          }
          .brand-row {
            display: flex;
            align-items: flex-start;
            gap: 16px;
          }
          .brand-row img {
            width: 62px;
            height: 62px;
            object-fit: contain;
          }
          .eyebrow {
            margin: 0 0 6px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: #f97316;
          }
          .brand-title {
            margin: 0;
            font-size: 31px;
            line-height: 1.05;
          }
          .brand-copy,
          .body-copy {
            margin: 0;
            color: #475569;
            line-height: 1.65;
          }
          .meta-card {
            border-radius: 24px;
            padding: 22px;
            background: rgba(255, 255, 255, 0.82);
            border: 1px solid #dbe4f0;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px 18px;
          }
          .panel-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
            gap: 24px;
            margin-top: 24px;
          }
          .panel,
          .totals-panel,
          .notes-panel,
          .terms-panel {
            border: 1px solid #dbe4f0;
            border-radius: 24px;
            padding: 22px;
            background: #ffffff;
          }
          .section-title {
            margin: 0 0 14px;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: ${templateTheme.sectionAccent};
          }
          .value {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
          }
          .muted {
            color: #64748b;
          }
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          .invoice-table th,
          .invoice-table td {
            padding: 14px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .invoice-table th {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #64748b;
          }
          .amount-cell {
            text-align: right !important;
            font-weight: 700;
            white-space: nowrap;
          }
          .totals-table {
            width: 100%;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .totals-table td:last-child {
            text-align: right;
            font-weight: 700;
            white-space: nowrap;
          }
          .grand-total td {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 0;
            padding-top: 14px;
          }
          .note-strip {
            margin-top: 20px;
            padding: 16px 20px;
            border-radius: 18px;
            background: ${templateTheme.noteGradient};
            color: #0a2c66;
            font-weight: 600;
          }
          .terms-list {
            margin: 12px 0 0;
            padding-left: 18px;
            color: #475569;
            line-height: 1.7;
          }
          .terms-list li + li {
            margin-top: 8px;
          }
          .footer-note {
            margin-top: 18px;
            font-size: 12px;
            color: #64748b;
          }
          @media print {
            .document {
              padding: 0;
            }
          }
          @media (max-width: 760px) {
            .hero-content,
            .panel-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <section class="hero">
            <div class="hero-band"></div>
            <div class="hero-content">
              <div>
                <div class="brand-row">
                  <img alt="TriCore Events logo" src="${escapeHtml(effectiveInvoiceConfig.companyLogoUrl)}" />
                  <div>
                    <p class="eyebrow">${escapeHtml(effectiveInvoiceConfig.companyName)}</p>
                    <h1 class="brand-title">${escapeHtml(documentLabel)}</h1>
                    <p class="brand-copy">Corporate sports operations, event delivery, and stakeholder billing documentation.</p>
                    <p class="brand-copy">${escapeHtml(effectiveInvoiceConfig.companyWebsite)}</p>
                    <p class="brand-copy">${escapeHtml(effectiveInvoiceConfig.companyEmail)}</p>
                  </div>
                </div>
              </div>

              <div class="meta-card">
                <div class="meta-grid">
                  <div>
                    <p class="eyebrow">Document No</p>
                    <p class="value">${escapeHtml(meta.documentNumber)}</p>
                  </div>
                  <div>
                    <p class="eyebrow">Issue Date</p>
                    <p class="value">${escapeHtml(formatOptionalDate(meta.issueDate))}</p>
                  </div>
                  <div>
                    <p class="eyebrow">Due Date</p>
                    <p class="value">${escapeHtml(formatOptionalDate(meta.dueDate))}</p>
                  </div>
                  <div>
                    <p class="eyebrow">Payment Terms</p>
                    <p class="value">${escapeHtml(effectiveInvoiceConfig.paymentTermsLabel || '-')}</p>
                  </div>
                  <div>
                    <p class="eyebrow">Event</p>
                    <p class="value">${escapeHtml(eventName)}</p>
                  </div>
                  <div>
                    <p class="eyebrow">Category</p>
                    <p class="value">${escapeHtml(categoryLabel)}</p>
                  </div>
                  <div>
                    <p class="eyebrow">Payment Mode</p>
                    <p class="value">${escapeHtml(transaction.paymentMode || '-')}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="panel-grid">
            <div class="panel">
              <h2 class="section-title">Bill To</h2>
              ${
                billingLines.length
                  ? billingLines.map((line) => `<p class="body-copy">${escapeHtml(line)}</p>`).join('')
                  : '<p class="body-copy muted">Billing details were not added for this transaction.</p>'
              }

              <table class="invoice-table" aria-label="Invoice line items">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Reference</th>
                    <th class="amount-cell">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <p class="value">${escapeHtml(meta.itemDescription)}</p>
                      <p class="body-copy">${escapeHtml(transaction.notes || 'No narrative attached to this line item.')}</p>
                    </td>
                    <td>
                      <p class="value">${escapeHtml(transaction.reference || '-')}</p>
                      <p class="body-copy">Document: ${escapeHtml(transaction.referenceDocument || meta.documentNumber)}</p>
                    </td>
                    <td class="amount-cell">${escapeHtml(formatCurrency(meta.subtotal))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="totals-panel">
              <h2 class="section-title">Summary</h2>
              <table class="totals-table" aria-label="Invoice totals">
                <tbody>
                  <tr>
                    <td>Subtotal</td>
                    <td>${escapeHtml(formatCurrency(meta.subtotal))}</td>
                  </tr>
                  <tr>
                    <td>${escapeHtml(taxSummary)}</td>
                    <td>${escapeHtml(formatCurrency(meta.taxAmount))}</td>
                  </tr>
                  <tr class="grand-total">
                    <td>Total</td>
                    <td>${escapeHtml(formatCurrency(meta.total))}</td>
                  </tr>
                </tbody>
              </table>

              ${
                effectiveInvoiceConfig.footerNotes
                  ? `<div class="note-strip">${escapeHtml(effectiveInvoiceConfig.footerNotes)}</div>`
                  : ''
              }
            </div>
          </section>

          <section class="notes-panel">
            <h2 class="section-title">Notes</h2>
            <p class="body-copy">${escapeHtml(notes)}</p>
          </section>

          <section class="terms-panel">
            <h2 class="section-title">General Terms and Conditions</h2>
            <ul class="terms-list">
              ${footerTerms.map((term) => `<li>${escapeHtml(term)}</li>`).join('')}
            </ul>
            <p class="footer-note">Generated from the TriCore accounting ledger for sponsors, vendors, partners, and stakeholder billing records.</p>
          </section>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=1080,height=780');

  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
};
