import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  createAccountingCategory,
  createTransaction,
  deleteAccountingCategory,
  deleteTransaction,
  downloadTransactions,
  getAccountingCategories,
  getAccountingDashboard,
  getTransactions,
  requestTransactionOtp,
  updateAccountingCategory as saveAccountingCategory,
  updateTransaction
} from '../../api/accountingApi.js';
import { getAdminEvents } from '../../api/eventsApi.js';
import { getInvoiceConfiguration } from '../../api/settingsApi.js';
import AccountingCategoryManager from '../../components/accounting/AccountingCategoryManager.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import TransactionForm from '../../components/accounting/TransactionForm.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import TypeaheadSelect from '../../components/common/TypeaheadSelect.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import { adminPermissions } from '../../data/adminAccess.js';
import {
  getCategoryLabel,
  getCategoryOptions,
  getCategoryValuesForType,
  paymentModeLabels,
  sourceLabels,
  transactionScopeLabels
} from '../../data/accountingOptions.js';
import useAdminAuth from '../../hooks/useAdminAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { downloadBlob } from '../../utils/download.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { printAccountingDocument } from '../../utils/printAccountingDocument.js';

const defaultDashboard = {
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  bankBalance: 0,
  cashBalance: 0,
  partnerBalance: 0,
  topPerformingEvent: null
};

const defaultTransactionData = {
  transactions: [],
  summary: {
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0
  }
};

const createInitialFilters = () => {
  return {
    eventId: '',
    period: 'range',
    month: '',
    year: '',
    dateFrom: '',
    dateTo: '',
    scope: '',
    type: '',
    category: '',
    paymentMode: '',
    source: ''
  };
};

const buildBaseParams = (filters) => {
  const params = {
    eventId: filters.eventId,
    scope: filters.scope
  };

  if (filters.dateFrom && filters.dateTo) {
    params.dateFrom = filters.dateFrom;
    params.dateTo = filters.dateTo;
  }

  return params;
};

const buildTransactionParams = (filters) => ({
  ...buildBaseParams(filters),
  type: filters.type,
  category: filters.category,
  paymentMode: filters.paymentMode,
  source: filters.source
});

const fetchAccountingPayload = async (filters, page = 1, limit = 10, { includeTransactions = true } = {}) => {
  const baseParams = buildBaseParams(filters);
  const transactionParams = {
    ...buildTransactionParams(filters),
    page,
    limit
  };

  const [dashboard, transactionData] = await Promise.all([
    getAccountingDashboard(baseParams),
    includeTransactions ? getTransactions(transactionParams) : Promise.resolve(defaultTransactionData)
  ]);

  return {
    dashboard,
    transactionData
  };
};

const getTypeBadgeClass = (type) =>
  type === 'expense'
    ? 'badge bg-orange-50 text-brand-orange'
    : 'badge bg-brand-mist text-brand-blue';

const getPaymentStatusBadgeClass = (status) => {
  if (status === 'Paid' || status === 'Confirmed') {
    return 'badge bg-emerald-50 text-emerald-700';
  }

  if (status === 'Under Review') {
    return 'badge bg-amber-50 text-amber-700';
  }

  if (status === 'Pending') {
    return 'badge bg-slate-100 text-slate-600';
  }

  return 'badge bg-red-50 text-red-600';
};

const normalizeViewParam = (value) =>
  value === 'ledger' || value === 'categories' ? value : 'record';

const createInitialCategoryForm = () => ({
  label: '',
  type: 'expense'
});

const sanitizeFiltersForCategories = (filters, categories) => {
  const nextFilters = { ...filters };
  const availableCategories = getCategoryValuesForType(categories, nextFilters.type);
  const allCategories = getCategoryValuesForType(categories, '');

  if (nextFilters.category && !allCategories.includes(nextFilters.category)) {
    nextFilters.category = '';
  }

  if (
    nextFilters.category &&
    nextFilters.type &&
    !availableCategories.includes(nextFilters.category)
  ) {
    nextFilters.category = '';
  }

  return nextFilters;
};


export default function AdminAccountingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAdminAuth();
  const [events, setEvents] = useState([]);
  const [accountingCategories, setAccountingCategories] = useState([]);
  const [draftFilters, setDraftFilters] = useState(() => createInitialFilters());
  const [activeFilters, setActiveFilters] = useState(() => createInitialFilters());
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [transactionData, setTransactionData] = useState(defaultTransactionData);
  const [invoiceConfig, setInvoiceConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formResetCounter, setFormResetCounter] = useState(0);
  const [exportingTransactions, setExportingTransactions] = useState(false);
  const [categoryForm, setCategoryForm] = useState(() => createInitialCategoryForm());
  const [categoryError, setCategoryError] = useState('');
  const [categorySuccess, setCategorySuccess] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  // Pagination state for Transaction Ledger
  // Always show latest 10 transactions by default
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [hasAppliedLedgerFilters, setHasAppliedLedgerFilters] = useState(false);
  const canAccessTransactions = hasPermission(adminPermissions.accountingTransactions);
  const requestedView = normalizeViewParam(searchParams.get('view'));
  const [activeView, setActiveView] = useState(requestedView);

  const defaultEventId = events[0]?._id || '';
  const categoryFilterOptions = getCategoryOptions(accountingCategories, draftFilters.type);
  const eventFilterOptions = [
    { value: '', label: 'All Events' },
    ...events.map((event) => ({
      value: event._id,
      label: event.name
    }))
  ];
  const scopeFilterOptions = [
    { value: '', label: 'All Scopes' },
    ...Object.entries(transactionScopeLabels).map(([value, label]) => ({
      value,
      label
    }))
  ];
  const typeFilterOptions = [
    { value: '', label: 'All Types' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' }
  ];
  const categorySelectOptions = [
    { value: '', label: 'All Categories' },
    ...categoryFilterOptions
  ];
  const paymentModeFilterOptions = [
    { value: '', label: 'All Modes' },
    ...Object.entries(paymentModeLabels).map(([value, label]) => ({
      value,
      label
    }))
  ];
  const sourceFilterOptions = [
    { value: '', label: 'All Sources' },
    { value: 'manual', label: 'Manual Entry' },
    { value: 'payment', label: 'Auto Payment' }
  ];

  useEffect(() => {
    const nextView = normalizeViewParam(requestedView);
    setActiveView((current) => (current === nextView ? current : nextView));
  }, [requestedView]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', 'transactions');
    nextParams.set('view', activeView);

    const nextQuery = nextParams.toString();
    if (nextQuery !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeView, searchParams, setSearchParams]);

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      const initialFilters = createInitialFilters();
      setLoading(true);

      try {
        const [eventsResponse, categoriesResponse, invoiceResponse] = await Promise.all([
          getAdminEvents(),
          getAccountingCategories(),
          getInvoiceConfiguration().catch(() => null)
        ]);

        if (ignore) {
          return;
        }

        const initialCategories = categoriesResponse.categories || [];
        setEvents(eventsResponse);
        setAccountingCategories(initialCategories);
        setInvoiceConfig(invoiceResponse);
        setDraftFilters(sanitizeFiltersForCategories(initialFilters, initialCategories));
        setActiveFilters(sanitizeFiltersForCategories(initialFilters, initialCategories));
        setDashboard(defaultDashboard);
        setTransactionData(defaultTransactionData);
        setTotalCount(0);
        setPage(1);
        setLimit(10);
        setHasAppliedLedgerFilters(false);
        setDataError('');
      } catch (error) {
        if (!ignore) {
          setDataError(
            getApiErrorMessage(error, 'Unable to load the accounting workspace.')
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  const refreshData = async (
    nextFilters = activeFilters,
    nextPage = 1,
    nextLimit = 10,
    targetSection = 'transactions'
  ) => {
    setRefreshing(true);
    try {
      const accountingPayload = await fetchAccountingPayload(nextFilters, nextPage, nextLimit, {
        includeTransactions: canAccessTransactions
      });

      setDashboard(accountingPayload.dashboard);

      if (targetSection === 'transactions') {
        setTransactionData(accountingPayload.transactionData);
        setTotalCount(accountingPayload.transactionData.totalCount || 0);
        setPage(accountingPayload.transactionData.page || nextPage);
        setLimit(accountingPayload.transactionData.limit || nextLimit);
      }

      setActiveFilters(nextFilters);
      setDataError('');
    } catch (error) {
      setDataError(getApiErrorMessage(error, 'Unable to refresh accounting data.'));
      throw error;
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setDraftFilters((current) => {
      const next = {
        ...current,
        [name]: value
      };

      if (name === 'scope' && value === 'common') {
        next.eventId = '';
      }

      if (name === 'type') {
        const allowedCategories = getCategoryValuesForType(accountingCategories, value);

        if (next.category && !allowedCategories.includes(next.category)) {
          next.category = '';
        }
      }

      return next;
    });
  };

  // Apply filters and reset to first page
  // On filter apply, always reset to page 1 and limit 10
  const handleApplyFilters = async (event) => {
    event.preventDefault();
    if (!draftFilters.dateFrom || !draftFilters.dateTo) {
      setDataError('Select both From and To dates before loading the transaction ledger.');
      return;
    }

    if (new Date(draftFilters.dateFrom) > new Date(draftFilters.dateTo)) {
      setDataError('From date must be before or equal to To date.');
      return;
    }

    try {
      setPage(1);
      setLimit(10);
      setHasAppliedLedgerFilters(true);
      await refreshData({ ...draftFilters }, 1, 10);
    } catch {
      return;
    }
  };

  // Reset filters and pagination
  // On reset, always show latest 10
  const handleResetFilters = () => {
    const nextFilters = createInitialFilters();
    setDraftFilters(nextFilters);
    setActiveFilters(nextFilters);
    setPage(1);
    setLimit(10);
    setHasAppliedLedgerFilters(false);
    setDashboard(defaultDashboard);
    setTransactionData(defaultTransactionData);
    setTotalCount(0);
    setDataError('');
  };
  // Pagination controls for Transaction Ledger
  const handlePageChange = async (newPage) => {
    if (!hasAppliedLedgerFilters) {
      return;
    }

    setPage(newPage);
    await refreshData(activeFilters, newPage, limit, 'transactions');
  };

  const handleLimitChange = async (e) => {
    if (!hasAppliedLedgerFilters) {
      return;
    }

    const newLimit = parseInt(e.target.value, 10) || 10;
    setLimit(newLimit);
    setPage(1);
    await refreshData(activeFilters, 1, newLimit, 'transactions');
  };

  const requestOtpCode = async (transaction, action) => {
    const approval = await requestTransactionOtp(transaction._id, { action });

    if (!approval?.required) {
      return '';
    }

    const enteredCode = window.prompt(
      `An OTP was sent to ${approval.email}. Enter the code to ${action} this transaction.`
    );

    if (!enteredCode) {
      throw new Error('OTP entry cancelled.');
    }

    return enteredCode.trim();
  };

  const handleTransactionSubmit = async (payload) => {
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      if (editingTransaction?._id) {
        const otpCode = await requestOtpCode(editingTransaction, 'update');
        await updateTransaction(
          editingTransaction._id,
          otpCode ? { ...payload, otpCode } : payload
        );
        setFormSuccess('Transaction updated successfully.');
      } else {
        await createTransaction(payload);
        setFormSuccess('Transaction recorded successfully.');
      }

      const wasEditing = Boolean(editingTransaction?._id);
      setEditingTransaction(null);
      setFormResetCounter((current) => current + 1);
      setActiveView(wasEditing ? 'ledger' : 'record');

      if (hasAppliedLedgerFilters) {
        const nextPage = wasEditing ? page : 1;
        setPage(nextPage);
        await refreshData(activeFilters, nextPage, limit, 'transactions');
      }
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          error?.message === 'OTP entry cancelled.'
            ? 'OTP entry was cancelled. Transaction changes were not saved.'
            : 'Unable to save the transaction.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transaction) => {
    if (!window.confirm(`Delete the transaction "${transaction.reference}"?`)) {
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const otpCode = await requestOtpCode(transaction, 'delete');
      await deleteTransaction(transaction._id, otpCode ? { otpCode } : {});
      setFormSuccess('Transaction deleted successfully.');

      if (editingTransaction?._id === transaction._id) {
        setEditingTransaction(null);
        setFormResetCounter((current) => current + 1);
      }

      const nextPage =
        transactionData.transactions.length === 1 && page > 1 ? page - 1 : page;

      setPage(nextPage);
      if (hasAppliedLedgerFilters) {
        await refreshData(activeFilters, nextPage, limit, 'transactions');
      }
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          error?.message === 'OTP entry cancelled.'
            ? 'OTP entry was cancelled. The transaction was not deleted.'
            : 'Unable to delete the transaction.'
        )
      );
    }
  };

  const handleExportTransactions = async () => {
    if (!hasAppliedLedgerFilters) {
      setDataError('Apply a date range before exporting the transaction ledger.');
      return;
    }

    setExportingTransactions(true);

    try {
      const blob = await downloadTransactions(buildTransactionParams(activeFilters));
      downloadBlob(blob, 'transactions.csv');
      setDataError('');
    } catch (error) {
      setDataError(getApiErrorMessage(error, 'Unable to export transactions.'));
    } finally {
      setExportingTransactions(false);
    }
  };

  const resetCategoryEditor = () => {
    setEditingCategory(null);
    setCategoryForm(createInitialCategoryForm());
  };

  const applyCategoryResponse = (response) => {
    const nextCategories = response?.categories || [];
    const nextDraftFilters = sanitizeFiltersForCategories(draftFilters, nextCategories);
    const nextActiveFilters = sanitizeFiltersForCategories(activeFilters, nextCategories);

    setAccountingCategories(nextCategories);
    setDraftFilters(nextDraftFilters);
    setActiveFilters(nextActiveFilters);

    return {
      nextCategories,
      nextDraftFilters,
      nextActiveFilters
    };
  };

  const refreshCategoriesOnly = async () => {
    setCategoriesLoading(true);

    try {
      const response = await getAccountingCategories();
      applyCategoryResponse(response);
      setCategoryError('');
    } catch (error) {
      setCategoryError(getApiErrorMessage(error, 'Unable to load accounting categories.'));
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCategoryFormChange = (event) => {
    const { name, value } = event.target;

    setCategoryForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      label: category.label,
      type: category.type
    });
    setCategoryError('');
    setCategorySuccess('');
    setActiveView('categories');
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete the category "${category.label}"?`)) {
      return;
    }

    setSavingCategory(true);
    setCategoryError('');
    setCategorySuccess('');

    try {
      const response = await deleteAccountingCategory(category.key);
      const { nextActiveFilters } = applyCategoryResponse(response);

      if (editingCategory?.key === category.key) {
        resetCategoryEditor();
      }

      setCategorySuccess('Accounting category deleted successfully.');
      if (hasAppliedLedgerFilters) {
        await refreshData(nextActiveFilters, page, limit, 'transactions');
      }
    } catch (error) {
      setCategoryError(getApiErrorMessage(error, 'Unable to delete this accounting category.'));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSubmitCategory = async (event) => {
    event.preventDefault();
    setSavingCategory(true);
    setCategoryError('');
    setCategorySuccess('');

    const payload = {
      label: categoryForm.label.trim(),
      type: categoryForm.type
    };

    try {
      const response = editingCategory
        ? await saveAccountingCategory(editingCategory.key, payload)
        : await createAccountingCategory(payload);

      const { nextActiveFilters } = applyCategoryResponse(response);

      resetCategoryEditor();
      setCategorySuccess(
        editingCategory
          ? 'Accounting category updated successfully.'
          : 'Accounting category added successfully.'
      );

      if (hasAppliedLedgerFilters) {
        await refreshData(nextActiveFilters, page, limit, 'transactions');
      }
    } catch (error) {
      setCategoryError(getApiErrorMessage(error, 'Unable to save this accounting category.'));
    } finally {
      setSavingCategory(false);
    }
  };

  const transactionColumns = [
    {
      key: 'eventCategory',
      header: 'Event / Category',
      accessor: (transaction) =>
        `${transaction.scope === 'common' ? 'Common Ledger' : transaction.eventId?.name || 'Deleted event'} ${
          transaction.categoryLabel || getCategoryLabel(accountingCategories, transaction.category)
        } ${transactionScopeLabels[transaction.scope] || transaction.scope}`,
      cell: (transaction) => (
        <div>
          <p className="font-semibold text-slate-900">
            {transaction.scope === 'common'
              ? 'Common Ledger'
              : transaction.eventId?.name || 'Deleted event'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {transaction.categoryLabel || getCategoryLabel(accountingCategories, transaction.category)}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            {transactionScopeLabels[transaction.scope] || transaction.scope}
          </p>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (transaction) => transaction.type,
      cell: (transaction) => (
        <span className={getTypeBadgeClass(transaction.type)}>{transaction.type}</span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (transaction) => transaction.amount || 0,
      exportValue: (transaction) => formatCurrency(transaction.amount),
      cell: (transaction) => (
        <span className="font-semibold text-slate-900">{formatCurrency(transaction.amount)}</span>
      )
    },
    {
      key: 'reference',
      header: 'Reference',
      accessor: (transaction) => transaction.reference || '',
      exportValue: (transaction) =>
        [
          transaction.reference,
          transaction.registrationReference &&
          transaction.registrationReference !== transaction.reference
            ? `Registration: ${transaction.registrationReference}`
            : '',
          transaction.notes || '',
          transaction.referenceDocument ? `Document: ${transaction.referenceDocument}` : ''
        ]
          .filter(Boolean)
          .join(' | '),
      cell: (transaction) => (
        <div>
          <p className="font-medium text-slate-800">{transaction.reference}</p>
          {transaction.registrationReference &&
          transaction.registrationReference !== transaction.reference ? (
            <p className="mt-1 text-xs text-slate-500">
              Registration: {transaction.registrationReference}
            </p>
          ) : null}
          {transaction.notes ? <p className="mt-2 text-xs text-slate-500">{transaction.notes}</p> : null}
          {transaction.referenceDocument ? (
            <p className="mt-2 text-xs text-slate-500">Document: {transaction.referenceDocument}</p>
          ) : null}
        </div>
      )
    },
    {
      key: 'date',
      header: 'Date',
      accessor: (transaction) => transaction.date,
      sortValue: (transaction) => new Date(transaction.date).getTime(),
      exportValue: (transaction) => formatDate(transaction.date),
      cell: (transaction) => <span className="text-slate-600">{formatDate(transaction.date)}</span>
    },
    {
      key: 'paymentMode',
      header: 'Mode',
      accessor: (transaction) => paymentModeLabels[transaction.paymentMode] || transaction.paymentMode,
      cell: (transaction) => (
        <span className="text-slate-600">
          {paymentModeLabels[transaction.paymentMode] || transaction.paymentMode}
        </span>
      )
    },
    {
      key: 'source',
      header: 'Source',
      accessor: (transaction) => sourceLabels[transaction.source] || transaction.source,
      cell: (transaction) => (
        <span className="badge bg-slate-100 text-slate-600">
          {sourceLabels[transaction.source] || transaction.source}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: () => '',
      exportable: false,
      sortable: false,
      cell: (transaction) => (
        <div className="flex flex-wrap gap-2">
          {transaction.canEdit ? (
            <button
              className="btn-secondary px-4 py-2"
              onClick={() => {
                setEditingTransaction(transaction);
                setFormError('');
                setFormSuccess('');
                setActiveView('record');
              }}
              type="button"
            >
              Edit
            </button>
          ) : (
            <span className="badge bg-slate-100 text-slate-600">Locked</span>
          )}
          <button
            className="btn-secondary px-4 py-2"
            onClick={() => printAccountingDocument(transaction, invoiceConfig)}
            type="button"
          >
            {transaction.type === 'expense' ? 'Print Bill' : 'Print Invoice'}
          </button>
          {transaction.canDelete ? (
            <button
              className="btn-primary px-4 py-2"
              onClick={() => handleDeleteTransaction(transaction)}
              type="button"
            >
              Delete
            </button>
          ) : null}
        </div>
      )
    }
  ];

  if (loading) {
    return <LoadingSpinner label="Loading accounting controls..." />;
  }

  return (
    <AdminPageShell
      description="Track event-wise income and expenses, record new transactions, and review profit reports from a single accounting command center."
      title="Accounting"
    >
      <div className="space-y-8">
        <section className="panel p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Transaction Workspace</h2>
              <p className="mt-2 text-sm text-slate-500">
                Accounting reporting has moved to the main Reports menu. This workspace now stays focused on transaction entry and ledger review.
              </p>
            </div>
            <span className="badge bg-brand-mist text-brand-blue">Transactions Only</span>
          </div>
          <div className="mt-6 inline-flex w-full rounded-2xl bg-slate-100 p-1 lg:w-auto">
            <button
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition lg:flex-none ${
                activeView === 'record' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
              }`}
              onClick={() => setActiveView('record')}
              type="button"
            >
              Record Transaction
            </button>
            <button
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition lg:flex-none ${
                activeView === 'ledger' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
              }`}
              onClick={() => setActiveView('ledger')}
              type="button"
            >
              Transaction Ledger
            </button>
            <button
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition lg:flex-none ${
                activeView === 'categories'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600'
              }`}
              onClick={async () => {
                setActiveView('categories');
                await refreshCategoriesOnly();
              }}
              type="button"
            >
              Manage Categories
            </button>
          </div>
          {activeView === 'record' ? (
            <div className="mt-6">
              <TransactionForm
                categories={accountingCategories}
                defaultEventId={defaultEventId}
                errorMessage={formError}
                events={events}
                initialValues={editingTransaction}
                invoiceDefaults={invoiceConfig}
                key={editingTransaction?._id || `new-${formResetCounter}`}
                onCancel={() => {
                  setEditingTransaction(null);
                  setFormError('');
                  setFormSuccess('');
                  setFormResetCounter((current) => current + 1);
                }}
                onSubmit={handleTransactionSubmit}
                submitting={submitting}
                successMessage={formSuccess}
              />
            </div>
          ) : activeView === 'categories' ? (
            <div className="mt-6">
              <AccountingCategoryManager
                categories={accountingCategories}
                editingCategory={editingCategory}
                errorMessage={categoryError}
                loading={categoriesLoading}
                onCancelEdit={resetCategoryEditor}
                onDelete={handleDeleteCategory}
                onEdit={handleEditCategory}
                onFormChange={handleCategoryFormChange}
                onSubmit={handleSubmitCategory}
                saving={savingCategory}
                successMessage={categorySuccess}
                values={categoryForm}
              />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Transaction Ledger</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Apply a date range and any column filters before loading ledger data.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="btn-secondary"
                    disabled={exportingTransactions}
                    onClick={handleExportTransactions}
                    type="button"
                  >
                    {exportingTransactions ? 'Exporting...' : 'Export Transactions'}
                  </button>
                </div>
              </div>

              <FormAlert message={dataError} />

              <form className="grid gap-4 xl:grid-cols-6" onSubmit={handleApplyFilters}>
                <div>
                  <label className="label" htmlFor="ledger-dateFrom">
                    From
                  </label>
                  <input
                    className="input"
                    id="ledger-dateFrom"
                    name="dateFrom"
                    onChange={handleFilterChange}
                    type="date"
                    value={draftFilters.dateFrom}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="ledger-dateTo">
                    To
                  </label>
                  <input
                    className="input"
                    id="ledger-dateTo"
                    name="dateTo"
                    onChange={handleFilterChange}
                    type="date"
                    value={draftFilters.dateTo}
                  />
                </div>
                <div className="xl:col-span-2">
                  <label className="label" htmlFor="ledger-eventId">
                    Event
                  </label>
                  <TypeaheadSelect
                    disabled={draftFilters.scope === 'common'}
                    id="ledger-eventId"
                    name="eventId"
                    onChange={handleFilterChange}
                    options={eventFilterOptions}
                    placeholder="All Events"
                    searchPlaceholder="Search events"
                    value={draftFilters.eventId}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="ledger-scope">
                    Scope
                  </label>
                  <TypeaheadSelect
                    id="ledger-scope"
                    name="scope"
                    onChange={handleFilterChange}
                    options={scopeFilterOptions}
                    placeholder="All Scopes"
                    searchPlaceholder="Search scopes"
                    value={draftFilters.scope}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="ledger-type">
                    Type
                  </label>
                  <TypeaheadSelect
                    id="ledger-type"
                    name="type"
                    onChange={handleFilterChange}
                    options={typeFilterOptions}
                    placeholder="All Types"
                    searchPlaceholder="Search types"
                    value={draftFilters.type}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="ledger-category">
                    Category
                  </label>
                  <TypeaheadSelect
                    id="ledger-category"
                    name="category"
                    onChange={handleFilterChange}
                    options={categorySelectOptions}
                    placeholder="All Categories"
                    searchPlaceholder="Search categories"
                    value={draftFilters.category}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="ledger-paymentMode">
                    Payment Mode
                  </label>
                  <TypeaheadSelect
                    id="ledger-paymentMode"
                    name="paymentMode"
                    onChange={handleFilterChange}
                    options={paymentModeFilterOptions}
                    placeholder="All Modes"
                    searchPlaceholder="Search payment modes"
                    value={draftFilters.paymentMode}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="ledger-source">
                    Source
                  </label>
                  <TypeaheadSelect
                    id="ledger-source"
                    name="source"
                    onChange={handleFilterChange}
                    options={sourceFilterOptions}
                    placeholder="All Sources"
                    searchPlaceholder="Search sources"
                    value={draftFilters.source}
                  />
                </div>
                <div className="xl:col-span-3 xl:self-end">
                  <div className="flex flex-wrap gap-3">
                    <button className="btn-primary" disabled={refreshing} type="submit">
                      {refreshing ? 'Applying...' : 'Apply Filters'}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={refreshing}
                      onClick={handleResetFilters}
                      type="button"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </form>

              {hasAppliedLedgerFilters ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
                    <StatCard
                      helper="Credits"
                      icon="revenue"
                      subtitle="Across the selected ledger range"
                      title="Total Credits"
                      tone="emerald"
                      value={formatCurrency(dashboard.totalIncome)}
                    />
                    <StatCard
                      helper="Debits"
                      icon="accounting"
                      subtitle="All operating costs in scope"
                      title="Total Debits"
                      tone="orange"
                      value={formatCurrency(dashboard.totalExpenses)}
                    />
                    <StatCard
                      helper="Net"
                      icon="trendUp"
                      subtitle="Credits minus debits"
                      title="Closing Balance"
                      tone="blue"
                      value={formatCurrency(dashboard.netProfit)}
                    />
                    <StatCard
                      helper="Bank"
                      icon="bank"
                      subtitle="Online, UPI, and bank-linked movement"
                      title="Bank Balance"
                      tone="slate"
                      value={formatCurrency(dashboard.bankBalance)}
                    />
                    <StatCard
                      helper="Cash"
                      icon="wallet"
                      subtitle="Cash ledger movement"
                      title="Cash Balance"
                      tone="slate"
                      value={formatCurrency(dashboard.cashBalance)}
                    />
                    <StatCard
                      helper={dashboard.topPerformingEvent ? 'Top Event' : 'Partners'}
                      icon={dashboard.topPerformingEvent ? 'trophy' : 'sparkle'}
                      subtitle={
                        dashboard.topPerformingEvent
                          ? dashboard.topPerformingEvent.name
                          : 'Partner share and distribution movement'
                      }
                      title={dashboard.topPerformingEvent ? 'Top Performing Event' : 'Partner Balance'}
                      tone={dashboard.topPerformingEvent ? 'blue' : 'orange'}
                      value={
                        dashboard.topPerformingEvent
                          ? formatCurrency(dashboard.topPerformingEvent.netProfit)
                          : formatCurrency(dashboard.partnerBalance)
                      }
                    />
                  </div>

                  <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-slate-950">Business Snapshot</h4>
                        <p className="mt-2 text-sm text-slate-500">
                          {activeFilters.dateFrom} to {activeFilters.dateTo}
                          {activeFilters.scope
                            ? `, ${transactionScopeLabels[activeFilters.scope] || activeFilters.scope.toLowerCase()}`
                            : ''}
                          {activeFilters.eventId
                            ? ` for ${
                                events.find((event) => event._id === activeFilters.eventId)?.name ||
                                'selected event'
                              }`
                            : ' across all events'}
                        </p>
                      </div>
                      <span className="badge bg-slate-100 text-slate-600">
                        {refreshing ? 'Refreshing data' : 'Filtered ledger view'}
                      </span>
                    </div>

                    {dashboard.topPerformingEvent ? (
                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-3xl bg-brand-mist p-5">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue">
                            Top Event
                          </p>
                          <p className="mt-3 text-2xl font-bold text-slate-950">
                            {dashboard.topPerformingEvent.name}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-white p-5">
                          <p className="text-sm text-slate-500">Income</p>
                          <p className="mt-3 text-2xl font-bold text-slate-950">
                            {formatCurrency(dashboard.topPerformingEvent.totalIncome)}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-white p-5">
                          <p className="text-sm text-slate-500">Expenses</p>
                          <p className="mt-3 text-2xl font-bold text-slate-950">
                            {formatCurrency(dashboard.topPerformingEvent.totalExpenses)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-6 rounded-2xl bg-white px-4 py-5 text-sm text-slate-500">
                        No event performance data is available yet for the current filter selection.
                      </p>
                    )}
                  </section>

                  {transactionData.transactions.length ? (
                    <DataTable
                      columns={transactionColumns}
                      emptyMessage="No transactions match the selected filters."
                      exportButtonLabel="Export This Page"
                      exportFileName="transactions-page.csv"
                      loading={refreshing}
                      loadingLabel="Refreshing transaction ledger..."
                      rowKey="_id"
                      rows={transactionData.transactions}
                      searchPlaceholder="Search transactions"
                      serverPagination={{
                        page,
                        pageSize: limit,
                        totalCount,
                        onPageChange: handlePageChange,
                        onPageSizeChange: (nextLimit) =>
                          handleLimitChange({ target: { value: String(nextLimit) } })
                      }}
                      tableClassName="min-w-[1180px]"
                    />
                  ) : (
                    <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No transactions match the selected filters.
                    </p>
                  )}
                </>
              ) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Select a date range and apply filters to load the transaction ledger.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </AdminPageShell>
  );
}
