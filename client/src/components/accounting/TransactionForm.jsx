import { useEffect, useState } from 'react';

import {
  getCategoryOptions,
  getDefaultCategoryForType,
  paymentModeLabels,
  transactionScopeLabels,
  transactionTypes
} from '../../data/accountingOptions.js';
import FormAlert from '../common/FormAlert.jsx';
import TypeaheadSelect from '../common/TypeaheadSelect.jsx';

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const addDaysToInputDate = (value, days = 0) => {
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  parsed.setUTCDate(parsed.getUTCDate() + Number(days || 0));
  return parsed.toISOString().slice(0, 10);
};

const buildInitialInvoiceDetails = (
  initialValues = {},
  fallbackDate = getTodayInputValue(),
  invoiceDefaults = {}
) => ({
  documentNumber:
    initialValues?.invoiceDetails?.documentNumber || initialValues?.referenceDocument || '',
  issueDate: initialValues?.invoiceDetails?.issueDate?.slice?.(0, 10) || fallbackDate,
  dueDate:
    initialValues?.invoiceDetails?.dueDate?.slice?.(0, 10) ||
    addDaysToInputDate(fallbackDate, invoiceDefaults.paymentTermsDays || 0),
  billToName: initialValues?.invoiceDetails?.billToName || '',
  billToCompany: initialValues?.invoiceDetails?.billToCompany || '',
  billToEmail: initialValues?.invoiceDetails?.billToEmail || '',
  billToPhone: initialValues?.invoiceDetails?.billToPhone || '',
  billingAddress: initialValues?.invoiceDetails?.billingAddress || '',
  itemDescription: initialValues?.invoiceDetails?.itemDescription || initialValues?.reference || '',
  taxLabel: initialValues?.invoiceDetails?.taxLabel || invoiceDefaults.defaultTaxLabel || '',
  taxRate:
    initialValues?.invoiceDetails?.taxRate === undefined ||
    initialValues?.invoiceDetails?.taxRate === null
      ? invoiceDefaults.defaultTaxRate ?? ''
      : initialValues.invoiceDetails.taxRate,
  taxAmount:
    initialValues?.invoiceDetails?.taxAmount === undefined ||
    initialValues?.invoiceDetails?.taxAmount === null
      ? ''
      : initialValues.invoiceDetails.taxAmount,
  subtotal:
    initialValues?.invoiceDetails?.subtotal === undefined ||
    initialValues?.invoiceDetails?.subtotal === null
      ? initialValues?.amount ?? ''
      : initialValues.invoiceDetails.subtotal,
  total:
    initialValues?.invoiceDetails?.total === undefined ||
    initialValues?.invoiceDetails?.total === null
      ? initialValues?.amount ?? ''
      : initialValues.invoiceDetails.total
});

const hasInvoiceContext = (initialValues = {}) => {
  const invoiceDetails = initialValues?.invoiceDetails || {};

  return Boolean(
    initialValues?.referenceDocument ||
      invoiceDetails.documentNumber ||
      invoiceDetails.billToName ||
      invoiceDetails.billToCompany ||
      invoiceDetails.billToEmail ||
      invoiceDetails.billToPhone ||
      invoiceDetails.billingAddress ||
      invoiceDetails.itemDescription ||
      invoiceDetails.taxLabel ||
      invoiceDetails.issueDate ||
      invoiceDetails.dueDate ||
      invoiceDetails.taxRate !== undefined ||
      invoiceDetails.taxAmount !== undefined ||
      invoiceDetails.subtotal !== undefined ||
      invoiceDetails.total !== undefined
  );
};

const buildInitialForm = (initialValues, defaultEventId, categories, invoiceDefaults) => {
  if (initialValues?._id) {
    const nextType = initialValues.type || 'income';
    const nextScope =
      initialValues.scope || (initialValues.eventId ? 'event' : 'common');
    const nextDate = initialValues.date?.slice(0, 10) || getTodayInputValue();

    return {
      scope: nextScope,
      eventId: initialValues.eventId?._id || initialValues.eventId || '',
      type: nextType,
      category: initialValues.category || getDefaultCategoryForType(categories, nextType),
      amount: initialValues.amount ?? '',
      date: nextDate,
      reference: initialValues.reference || '',
      referenceDocument: initialValues.referenceDocument || '',
      paymentMode: initialValues.paymentMode || 'online',
      notes: initialValues.notes || '',
      generateInvoice: hasInvoiceContext(initialValues),
      invoiceDetails: buildInitialInvoiceDetails(initialValues, nextDate, invoiceDefaults)
    };
  }

  const nextDate = getTodayInputValue();

  return {
    scope: 'event',
    eventId: defaultEventId || '',
    type: 'income',
    category: getDefaultCategoryForType(categories, 'income'),
    amount: '',
    date: nextDate,
    reference: '',
    referenceDocument: '',
    paymentMode: 'online',
    notes: '',
    generateInvoice: false,
    invoiceDetails: buildInitialInvoiceDetails({}, nextDate, invoiceDefaults)
  };
};

const getTransactionErrors = (form) => {
  const errors = {};

  if (form.scope !== 'common' && !form.eventId) {
    errors.eventId = 'Select an event for this transaction.';
  }

  if (!form.date) {
    errors.date = 'Transaction date is required.';
  }

  if (!form.reference?.trim() || form.reference.trim().length < 2) {
    errors.reference = 'Reference should be at least 2 characters.';
  }

  if (!form.amount || Number(form.amount) <= 0) {
    errors.amount = 'Amount must be greater than 0.';
  }

  return errors;
};

export default function TransactionForm({
  categories,
  defaultEventId,
  errorMessage,
  events,
  initialValues,
  invoiceDefaults,
  onCancel,
  onSubmit,
  submitting,
  successMessage
}) {
  const [form, setForm] = useState(
    buildInitialForm(initialValues, defaultEventId, categories, invoiceDefaults)
  );
  const [errors, setErrors] = useState({});
  const isEditing = Boolean(initialValues?._id);
  const categoryOptions = getCategoryOptions(categories, form.type);
  const eventOptions = events.map((event) => ({
    value: event._id,
    label: event.name
  }));

  useEffect(() => {
    setForm(buildInitialForm(initialValues, defaultEventId, categories, invoiceDefaults));
    setErrors({});
  }, [categories, defaultEventId, initialValues, invoiceDefaults]);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;

    setForm((current) => {
      const next = {
        ...current,
        [name]: nextValue
      };

      if (name === 'type') {
        const nextOptions = getCategoryOptions(categories, nextValue);
        const nextValues = nextOptions.map((option) => option.value);

        if (!nextValues.includes(current.category)) {
          next.category = getDefaultCategoryForType(categories, nextValue);
        }

      }

      if (name === 'scope') {
        if (nextValue === 'common') {
          next.eventId = '';
        }

        if (nextValue === 'event' && !current.eventId) {
          next.eventId = defaultEventId || '';
        }
      }

      if (name === 'date') {
        next.invoiceDetails = {
          ...current.invoiceDetails
        };

        if (!current.invoiceDetails.issueDate) {
          next.invoiceDetails.issueDate = value;
        }

        if (!current.invoiceDetails.dueDate) {
          next.invoiceDetails.dueDate = value;
        }
      }

      return next;
    });

    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const handleInvoiceDetailsChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      invoiceDetails: {
        ...current.invoiceDetails,
        [name]: value
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = getTransactionErrors(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const { generateInvoice: _generateInvoice, ...transactionForm } = form;

    await onSubmit({
      ...transactionForm,
      eventId: transactionForm.scope === 'common' ? undefined : transactionForm.eventId,
      amount: Number(transactionForm.amount),
      reference: transactionForm.reference.trim(),
      referenceDocument: transactionForm.referenceDocument.trim(),
      notes: transactionForm.notes.trim(),
      invoiceDetails: form.generateInvoice
        ? {
            documentNumber: form.invoiceDetails.documentNumber.trim(),
            issueDate: form.invoiceDetails.issueDate,
            dueDate: form.invoiceDetails.dueDate,
            billToName: form.invoiceDetails.billToName.trim(),
            billToCompany: form.invoiceDetails.billToCompany.trim(),
            billToEmail: form.invoiceDetails.billToEmail.trim(),
            billToPhone: form.invoiceDetails.billToPhone.trim(),
            billingAddress: form.invoiceDetails.billingAddress.trim(),
            itemDescription: form.invoiceDetails.itemDescription.trim(),
            taxLabel: form.invoiceDetails.taxLabel.trim(),
            taxRate:
              form.invoiceDetails.taxRate === '' ? undefined : Number(form.invoiceDetails.taxRate),
            taxAmount:
              form.invoiceDetails.taxAmount === '' ? undefined : Number(form.invoiceDetails.taxAmount),
            subtotal:
              form.invoiceDetails.subtotal === '' ? undefined : Number(form.invoiceDetails.subtotal),
            total: form.invoiceDetails.total === '' ? undefined : Number(form.invoiceDetails.total)
          }
        : undefined
    });
  };

  const renderFieldError = (field) =>
    errors[field] ? (
      <p className="mt-2 text-xs font-medium text-red-600">{errors[field]}</p>
    ) : null;

  return (
    <form className="panel space-y-6 p-6" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Edit Transaction' : 'Record Transaction'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Capture sponsorship income, vendor expenses, and other accounting
          movements across events and the company ledger.
        </p>
      </div>

      <FormAlert message={errorMessage} />
      <FormAlert message={successMessage} type="success" />

      {form.type === 'income' ? (
        <p className="rounded-2xl bg-brand-mist px-4 py-3 text-sm text-brand-blue">
          Successful registration payments are auto-recorded. Use manual income
          entries for sponsorships, advertisements, and other receipts.
        </p>
      ) : null}

      {form.scope === 'common' ? (
        <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-brand-orange">
          Common ledger entries are not tied to a specific event. Use this for
          organization-level operations.
        </p>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
              Transaction Details
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              Record the accounting entry first
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Keep the base transaction compact: what it is, when it happened, how it was paid,
              and what reference it belongs to.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="type">
              Transaction Type
            </label>
            <TypeaheadSelect
              id="type"
              name="type"
              onChange={handleChange}
              options={transactionTypes}
              placeholder="Select type"
              searchPlaceholder="Search types"
              value={form.type}
            />
          </div>

          <div>
            <label className="label" htmlFor="scope">
              Ledger Scope
            </label>
            <TypeaheadSelect
              id="scope"
              name="scope"
              onChange={handleChange}
              options={Object.entries(transactionScopeLabels).map(([optionValue, label]) => ({
                value: optionValue,
                label
              }))}
              placeholder="Select scope"
              searchPlaceholder="Search scopes"
              value={form.scope}
            />
            {renderFieldError('scope')}
          </div>

          {form.scope !== 'common' ? (
            <div className="md:col-span-2">
              <label className="label" htmlFor="eventId">
                Event
              </label>
              <TypeaheadSelect
                disabled={!events.length}
                id="eventId"
                name="eventId"
                noOptionsMessage="No events are available."
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select Event' },
                  ...eventOptions
                ]}
                placeholder="Select event"
                searchPlaceholder="Search events"
                required={form.scope !== 'common'}
                value={form.eventId}
              />
              {renderFieldError('eventId')}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-600 md:col-span-2">
              This entry will be saved in the common company ledger and included in overall
              accounting totals.
            </div>
          )}

          <div>
            <label className="label" htmlFor="category">
              Category
            </label>
            <TypeaheadSelect
              id="category"
              name="category"
              onChange={handleChange}
              options={categoryOptions}
              placeholder="Select category"
              searchPlaceholder="Search categories"
              value={form.category}
            />
          </div>

          <div>
            <label className="label" htmlFor="amount">
              Amount
            </label>
            <input
              className="input"
              id="amount"
              min="1"
              name="amount"
              onChange={handleChange}
              required
              type="number"
              value={form.amount}
            />
            {renderFieldError('amount')}
          </div>

          <div>
            <label className="label" htmlFor="date">
              Transaction Date
            </label>
            <input
              className="input"
              id="date"
              name="date"
              onChange={handleChange}
              required
              type="date"
              value={form.date}
            />
            {renderFieldError('date')}
          </div>

          <div>
            <label className="label" htmlFor="paymentMode">
              Payment Method
            </label>
            <TypeaheadSelect
              id="paymentMode"
              name="paymentMode"
              onChange={handleChange}
              options={Object.entries(paymentModeLabels).map(([optionValue, label]) => ({
                value: optionValue,
                label
              }))}
              placeholder="Select payment mode"
              searchPlaceholder="Search payment modes"
              value={form.paymentMode}
            />
          </div>

          <div className="md:col-span-2">
            <label className="label" htmlFor="reference">
              Reference
            </label>
            <input
              className="input"
              id="reference"
              name="reference"
              onChange={handleChange}
              placeholder="Team name, sponsor, vendor, or transaction subject"
              required
              value={form.reference}
            />
            {renderFieldError('reference')}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
            Supporting Details
          </p>
          <h3 className="mt-2 text-lg font-bold text-slate-950">
            Notes and reconciliation context
          </h3>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label" htmlFor="referenceDocument">
              Supporting Document / Reference No.
            </label>
            <input
              className="input"
              id="referenceDocument"
              name="referenceDocument"
              onChange={handleChange}
              placeholder="UTR, voucher id, sponsor reference, or document number"
              value={form.referenceDocument}
            />
          </div>

          <div className="md:col-span-2">
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea
              className="input min-h-28"
              id="notes"
              name="notes"
              onChange={handleChange}
              placeholder="Add supporting details for reconciliation"
              value={form.notes}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
              Invoice / Bill
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              Add document details only when official billing is required
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Use this for sponsor invoices, vendor bills, or any transaction that needs a
              printable document. Leave it off for normal ledger entries.
            </p>
            {invoiceDefaults?.paymentTermsLabel ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-brand-orange">
                Default payment terms: {invoiceDefaults.paymentTermsLabel}
              </p>
            ) : null}
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700">
            <input
              checked={form.generateInvoice}
              name="generateInvoice"
              onChange={handleChange}
              type="checkbox"
            />
            Generate invoice for this transaction
          </label>
        </div>

        {form.generateInvoice ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="documentNumber">
                Invoice Number
              </label>
              <input
                className="input"
                id="documentNumber"
                name="documentNumber"
                onChange={handleInvoiceDetailsChange}
                placeholder="Leave blank to auto-generate from invoice settings"
                value={form.invoiceDetails.documentNumber}
              />
            </div>

            <div>
              <label className="label" htmlFor="itemDescription">
                Line Item Description
              </label>
              <input
                className="input"
                id="itemDescription"
                name="itemDescription"
                onChange={handleInvoiceDetailsChange}
                placeholder="Sponsorship support, vendor services, event billing"
                value={form.invoiceDetails.itemDescription}
              />
            </div>

            <div>
              <label className="label" htmlFor="issueDate">
                Invoice Date
              </label>
              <input
                className="input"
                id="issueDate"
                name="issueDate"
                onChange={handleInvoiceDetailsChange}
                type="date"
                value={form.invoiceDetails.issueDate}
              />
            </div>

            <div>
              <label className="label" htmlFor="dueDate">
                Due Date
              </label>
              <input
                className="input"
                id="dueDate"
                name="dueDate"
                onChange={handleInvoiceDetailsChange}
                type="date"
                value={form.invoiceDetails.dueDate}
              />
            </div>

            <div>
              <label className="label" htmlFor="billToName">
                Billing Contact
              </label>
              <input
                className="input"
                id="billToName"
                name="billToName"
                onChange={handleInvoiceDetailsChange}
                placeholder="Primary billing contact"
                value={form.invoiceDetails.billToName}
              />
            </div>

            <div>
              <label className="label" htmlFor="billToCompany">
                Company / Organization
              </label>
              <input
                className="input"
                id="billToCompany"
                name="billToCompany"
                onChange={handleInvoiceDetailsChange}
                placeholder="Billing company name"
                value={form.invoiceDetails.billToCompany}
              />
            </div>

            <div>
              <label className="label" htmlFor="billToEmail">
                Billing Email
              </label>
              <input
                className="input"
                id="billToEmail"
                name="billToEmail"
                onChange={handleInvoiceDetailsChange}
                placeholder="accounts@example.com"
                type="email"
                value={form.invoiceDetails.billToEmail}
              />
            </div>

            <div>
              <label className="label" htmlFor="billToPhone">
                Billing Phone
              </label>
              <input
                className="input"
                id="billToPhone"
                name="billToPhone"
                onChange={handleInvoiceDetailsChange}
                placeholder="+91 90000 00000"
                value={form.invoiceDetails.billToPhone}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label" htmlFor="billingAddress">
                Billing Address
              </label>
              <textarea
                className="input min-h-24"
                id="billingAddress"
                name="billingAddress"
                onChange={handleInvoiceDetailsChange}
                placeholder="Registered office or billing address"
                value={form.invoiceDetails.billingAddress}
              />
            </div>

            <div>
              <label className="label" htmlFor="subtotal">
                Subtotal
              </label>
              <input
                className="input"
                id="subtotal"
                min="0"
                name="subtotal"
                onChange={handleInvoiceDetailsChange}
                type="number"
                value={form.invoiceDetails.subtotal}
              />
            </div>

            <div>
              <label className="label" htmlFor="taxLabel">
                Tax Label
              </label>
              <input
                className="input"
                id="taxLabel"
                name="taxLabel"
                onChange={handleInvoiceDetailsChange}
                placeholder="GST"
                value={form.invoiceDetails.taxLabel}
              />
            </div>

            <div>
              <label className="label" htmlFor="taxRate">
                Tax Rate (%)
              </label>
              <input
                className="input"
                id="taxRate"
                min="0"
                name="taxRate"
                onChange={handleInvoiceDetailsChange}
                step="0.01"
                type="number"
                value={form.invoiceDetails.taxRate}
              />
            </div>

            <div>
              <label className="label" htmlFor="taxAmount">
                Tax Amount
              </label>
              <input
                className="input"
                id="taxAmount"
                min="0"
                name="taxAmount"
                onChange={handleInvoiceDetailsChange}
                step="0.01"
                type="number"
                value={form.invoiceDetails.taxAmount}
              />
            </div>

            <div>
              <label className="label" htmlFor="total">
                Total Amount
              </label>
              <input
                className="input"
                id="total"
                min="0"
                name="total"
                onChange={handleInvoiceDetailsChange}
                step="0.01"
                type="number"
                value={form.invoiceDetails.total}
              />
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">
            Invoice and billing fields stay hidden until you explicitly choose to generate a
            document for this transaction.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          className="btn-primary"
          disabled={submitting || (form.scope !== 'common' && !events.length)}
          type="submit"
        >
          {submitting
            ? 'Saving...'
            : isEditing
              ? 'Update Transaction'
              : `Save ${form.type === 'income' ? 'Income' : 'Expense'}`}
        </button>
        {isEditing ? (
          <button className="btn-secondary" onClick={onCancel} type="button">
            Cancel Edit
          </button>
        ) : null}
      </div>
    </form>
  );
}
