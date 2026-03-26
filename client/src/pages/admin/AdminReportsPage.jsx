import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { downloadActivityLogs, getActivityLogs } from '../../api/activityLogApi.js';
import { downloadAccountingReports, getAccountingReports } from '../../api/accountingApi.js';
import { downloadReportsOverview, getReportsOverview } from '../../api/dashboardApi.js';
import { getAdminEvents } from '../../api/eventsApi.js';
import { acknowledgeSecurityAlert, getSecurityAlerts } from '../../api/securityAlertApi.js';
import BreakdownChart from '../../components/accounting/BreakdownChart.jsx';
import AdminFilterPanel from '../../components/admin/AdminFilterPanel.jsx';
import AppIcon from '../../components/common/AppIcon.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import TypeaheadSelect from '../../components/common/TypeaheadSelect.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import { adminPermissions } from '../../data/adminAccess.js';
import { transactionScopeLabels } from '../../data/accountingOptions.js';
import useAdminAuth from '../../hooks/useAdminAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { createDefaultDateRangeFilters } from '../../utils/dateRange.js';
import { downloadBlob } from '../../utils/download.js';
import { formatCurrency, formatDateTime } from '../../utils/formatters.js';

const defaultFinanceReport = {
  overallBusinessReport: { totalIncome: 0, totalExpenses: 0, netProfit: 0 },
  eventProfitReport: [],
  incomeReport: { totalIncome: 0, breakdown: [] },
  expenseReport: { totalExpenses: 0, breakdown: [] },
  paymentStatusReport: {
    counts: { Confirmed: 0, Pending: 0, 'Under Review': 0, Failed: 0 },
    paidUsers: [],
    pendingUsers: [],
    underReviewUsers: [],
    failedUsers: []
  },
  dateWiseReport: { timeline: [] }
};

const paymentStatusTabs = [
  {
    key: 'Confirmed',
    label: 'Confirmed Payments',
    rowKey: 'paidUsers',
    tone: {
      shellClassName: 'border-emerald-100',
      toolbarClassName: 'bg-emerald-50',
      headerClassName: 'bg-emerald-50/40'
    }
  },
  {
    key: 'Pending',
    label: 'Pending Users',
    rowKey: 'pendingUsers',
    tone: {
      shellClassName: 'border-slate-200',
      toolbarClassName: 'bg-slate-100',
      headerClassName: 'bg-slate-100/50'
    }
  },
  {
    key: 'Under Review',
    label: 'Under Review',
    rowKey: 'underReviewUsers',
    tone: {
      shellClassName: 'border-amber-100',
      toolbarClassName: 'bg-amber-50',
      headerClassName: 'bg-amber-50/50'
    }
  },
  {
    key: 'Failed',
    label: 'Failed Payments',
    rowKey: 'failedUsers',
    tone: {
      shellClassName: 'border-rose-100',
      toolbarClassName: 'bg-rose-50',
      headerClassName: 'bg-rose-50/50'
    }
  }
];

const alertCategoryLabels = {
  security: 'Security',
  contact: 'Contact',
  registration: 'Registration',
  payment: 'Payment',
  system: 'System'
};

const getAlertIconName = (alert) => {
  if (alert?.category === 'contact') {
    return 'users';
  }

  if (alert?.category === 'registration') {
    return 'registrations';
  }

  if (alert?.category === 'payment') {
    return 'accounting';
  }

  return 'security';
};

const getAlertContextLines = (alert) => {
  const lines = [];
  const metadata = alert?.metadata || {};

  if (metadata.userName || metadata.userEmail) {
    lines.push(`${metadata.userName || 'User'}${metadata.userEmail ? ` • ${metadata.userEmail}` : ''}`);
  }

  if (metadata.registrant && metadata.registrant !== metadata.userName) {
    lines.push(`Registrant: ${metadata.registrant}`);
  }

  if (metadata.eventName) {
    lines.push(`Event: ${metadata.eventName}`);
  }

  if (metadata.paymentStatus) {
    lines.push(`Status: ${metadata.paymentStatus}`);
  }

  if (metadata.amount) {
    lines.push(`Amount: ${formatCurrency(metadata.amount)}`);
  }

  if (metadata.orderId && metadata.orderId !== '-') {
    lines.push(`Order: ${metadata.orderId}`);
  }

  if (metadata.forwardingStatus) {
    lines.push(`Forwarding: ${metadata.forwardingStatus}`);
  }

  if (metadata.sourceIp && metadata.sourceIp !== '-') {
    lines.push(`IP: ${metadata.sourceIp}`);
  }

  if (alert?.method || alert?.path || alert?.ip) {
    lines.push(`${alert.method || '-'} ${alert.path || '-'} ${alert.ip || '-'}`.trim());
  }

  return lines.filter(Boolean);
};

const normalizeTab = (value, allowedTabs) =>
  allowedTabs.includes(value) ? value : allowedTabs[0] || 'overview';

const createFinanceFilters = () =>
  createDefaultDateRangeFilters({
    eventId: '',
    scope: ''
  });

const createActivityFilters = () => createDefaultDateRangeFilters();

const buildFinanceParams = (filters) => {
  const params = { eventId: filters.eventId, scope: filters.scope };

  if (filters.dateFrom && filters.dateTo) {
    params.dateFrom = filters.dateFrom;
    params.dateTo = filters.dateTo;
  }

  return params;
};

export default function AdminReportsPage() {
  const { hasPermission } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canViewOverview = hasPermission(adminPermissions.reports);
  const canViewFinance = hasPermission(adminPermissions.accountingReports);
  const canViewSecurity =
    hasPermission(adminPermissions.overview) ||
    hasPermission(adminPermissions.settings) ||
    hasPermission(adminPermissions.reports);
  const availableTabs = useMemo(
    () =>
      [
        canViewOverview ? 'overview' : null,
        canViewFinance ? 'finance' : null,
        canViewOverview ? 'activity' : null,
        canViewSecurity ? 'security' : null
      ].filter(Boolean),
    [canViewFinance, canViewOverview, canViewSecurity]
  );
  const activeTab = normalizeTab(searchParams.get('tab'), availableTabs);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState({ eventMetrics: [], sportTypeAnalytics: [] });
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewLoaded, setOverviewLoaded] = useState(false);
  const [exportingOverview, setExportingOverview] = useState(false);

  const [financeDraftFilters, setFinanceDraftFilters] = useState(createFinanceFilters());
  const [financeActiveFilters, setFinanceActiveFilters] = useState(createFinanceFilters());
  const [financeReport, setFinanceReport] = useState(defaultFinanceReport);
  const [financeEvents, setFinanceEvents] = useState([]);
  const [financeEventsLoading, setFinanceEventsLoading] = useState(false);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [hasAppliedFinanceFilters, setHasAppliedFinanceFilters] = useState(false);
  const [activePaymentTab, setActivePaymentTab] = useState(paymentStatusTabs[0].key);
  const [exportingFinance, setExportingFinance] = useState(false);

  const [activityDraftFilters, setActivityDraftFilters] = useState(createActivityFilters());
  const [activityActiveFilters, setActivityActiveFilters] = useState(createActivityFilters());
  const [activityLogData, setActivityLogData] = useState({ items: [], totalCount: 0 });
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit, setActivityLimit] = useState(10);
  const [activityLoading, setActivityLoading] = useState(false);
  const [hasAppliedActivityFilters, setHasAppliedActivityFilters] = useState(false);
  const [exportingHistory, setExportingHistory] = useState(false);

  const [securityAlerts, setSecurityAlerts] = useState({ items: [], totalCount: 0, openCount: 0 });
  const [securityPage, setSecurityPage] = useState(1);
  const [securityLimit, setSecurityLimit] = useState(10);
  const [securityStatus, setSecurityStatus] = useState('open');
  const [securitySeverity, setSecuritySeverity] = useState('');
  const [securityCategory, setSecurityCategory] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [lastSecurityRequestKey, setLastSecurityRequestKey] = useState('');
  const [acknowledgingId, setAcknowledgingId] = useState('');

  useEffect(() => {
    if (activeTab !== 'overview' || !canViewOverview || overviewLoaded) return;
    let ignore = false;
    const loadOverview = async () => {
      setOverviewLoading(true);
      try {
        const response = await getReportsOverview();
        if (ignore) return;
        setOverview(response);
        setOverviewLoaded(true);
        setError('');
      } catch (requestError) {
        if (ignore) return;
        setError(getApiErrorMessage(requestError, 'Unable to load overview reports right now.'));
      } finally {
        if (!ignore) {
          setOverviewLoading(false);
        }
      }
    };
    loadOverview();
    return () => {
      ignore = true;
    };
  }, [activeTab, canViewOverview, overviewLoaded]);

  useEffect(() => {
    if (activeTab !== 'finance' || !canViewFinance || financeEvents.length) return;
    let ignore = false;
    const loadFinanceEvents = async () => {
      setFinanceEventsLoading(true);
      try {
        const eventsResponse = await getAdminEvents();
        if (ignore) return;
        setFinanceEvents(eventsResponse);
        setError('');
      } catch (requestError) {
        if (ignore) return;
        setError(getApiErrorMessage(requestError, 'Unable to load finance filters right now.'));
      } finally {
        if (!ignore) {
          setFinanceEventsLoading(false);
        }
      }
    };
    loadFinanceEvents();
    return () => {
      ignore = true;
    };
  }, [activeTab, canViewFinance, financeEvents.length]);

  useEffect(() => {
    if (activeTab !== 'activity' || !canViewOverview || !hasAppliedActivityFilters) return;
    let ignore = false;
    const loadActivityPage = async () => {
      setActivityLoading(true);
      try {
        const response = await getActivityLogs({
          ...activityActiveFilters,
          page: activityPage,
          limit: activityLimit
        });
        if (ignore) return;
        setActivityLogData(response);
        setError('');
      } catch (requestError) {
        if (ignore) return;
        setError(getApiErrorMessage(requestError, 'Unable to load activity history right now.'));
      } finally {
        if (!ignore) {
          setActivityLoading(false);
        }
      }
    };
    loadActivityPage();
    return () => {
      ignore = true;
    };
  }, [activeTab, activityLimit, activityPage, canViewOverview, hasAppliedActivityFilters]);

  useEffect(() => {
    if (activeTab !== 'security' || !canViewSecurity) return;
    const requestKey = `${securityPage}:${securityLimit}:${securityStatus}:${securitySeverity}:${securityCategory}`;
    if (securityLoaded && lastSecurityRequestKey === requestKey) return;
    let ignore = false;
    const loadSecurityAlerts = async () => {
      setSecurityLoading(true);
      try {
        const response = await getSecurityAlerts({
          page: securityPage,
          limit: securityLimit,
          status: securityStatus,
          severity: securitySeverity,
          category: securityCategory
        });
        if (ignore) return;
        setSecurityAlerts(response);
        setSecurityLoaded(true);
        setLastSecurityRequestKey(requestKey);
        setError('');
      } catch (requestError) {
        if (ignore) return;
        setError(getApiErrorMessage(requestError, 'Unable to load alerts right now.'));
      } finally {
        if (!ignore) {
          setSecurityLoading(false);
        }
      }
    };
    loadSecurityAlerts();
    return () => {
      ignore = true;
    };
  }, [
    activeTab,
    canViewSecurity,
    lastSecurityRequestKey,
    securityLimit,
    securityLoaded,
    securityPage,
    securityCategory,
    securitySeverity,
    securityStatus
  ]);

  const eventMetricColumns = useMemo(
    () => [
      { key: 'name', header: 'Event', accessor: (item) => item.name || '', cell: (item) => <span className="font-semibold text-slate-900">{item.name}</span> },
      { key: 'sportType', header: 'Sport', accessor: (item) => item.sportType || '', cell: (item) => <span className="text-slate-600">{item.sportType}</span> },
      { key: 'registrationCount', header: 'Registrations', accessor: (item) => item.registrationCount || 0, cell: (item) => <span className="text-slate-600">{item.registrationCount || 0}</span> },
      { key: 'revenue', header: 'Revenue', accessor: (item) => item.revenue || 0, exportValue: (item) => formatCurrency(item.revenue), cell: (item) => <span className="text-slate-600">{formatCurrency(item.revenue)}</span> }
    ],
    []
  );

  const financeEventColumns = useMemo(
    () => [
      { key: 'eventName', header: 'Event', accessor: (item) => item.eventName || '', cell: (item) => <span className="font-semibold text-slate-900">{item.eventName}</span> },
      { key: 'sportType', header: 'Sport', accessor: (item) => item.sportType || '', cell: (item) => <span className="text-slate-600">{item.sportType || '-'}</span> },
      { key: 'totalIncome', header: 'Income', accessor: (item) => item.totalIncome || 0, exportValue: (item) => formatCurrency(item.totalIncome), cell: (item) => <span className="text-emerald-700">{formatCurrency(item.totalIncome)}</span> },
      { key: 'totalExpenses', header: 'Expenses', accessor: (item) => item.totalExpenses || 0, exportValue: (item) => formatCurrency(item.totalExpenses), cell: (item) => <span className="text-brand-orange">{formatCurrency(item.totalExpenses)}</span> },
      { key: 'netProfitLoss', header: 'Net', accessor: (item) => item.netProfitLoss || 0, exportValue: (item) => formatCurrency(item.netProfitLoss), cell: (item) => <span className={item.netProfitLoss >= 0 ? 'text-brand-blue' : 'text-rose-600'}>{formatCurrency(item.netProfitLoss)}</span> }
    ],
    []
  );

  const financeDateColumns = useMemo(
    () => [
      { key: '_id', header: 'Date', accessor: (item) => item._id || '', cell: (item) => <span className="font-semibold text-slate-900">{item._id}</span> },
      { key: 'income', header: 'Income', accessor: (item) => item.income || 0, exportValue: (item) => formatCurrency(item.income), cell: (item) => <span className="text-emerald-700">{formatCurrency(item.income)}</span> },
      { key: 'expenses', header: 'Expenses', accessor: (item) => item.expenses || 0, exportValue: (item) => formatCurrency(item.expenses), cell: (item) => <span className="text-brand-orange">{formatCurrency(item.expenses)}</span> },
      { key: 'netProfit', header: 'Net', accessor: (item) => item.netProfit || 0, exportValue: (item) => formatCurrency(item.netProfit), cell: (item) => <span className={item.netProfit >= 0 ? 'text-brand-blue' : 'text-rose-600'}>{formatCurrency(item.netProfit)}</span> }
    ],
    []
  );

  const profitLossRows = useMemo(() => {
    const incomeRows = (financeReport.incomeReport?.breakdown || []).map((item) => ({
      id: `income-${item.category}`,
      section: 'Income',
      lineItem: item.label || item.category,
      amount: item.total || 0,
      tone: 'income'
    }));

    const expenseRows = (financeReport.expenseReport?.breakdown || []).map((item) => ({
      id: `expense-${item.category}`,
      section: 'Expense',
      lineItem: item.label || item.category,
      amount: -(item.total || 0),
      tone: 'expense'
    }));

    return [
      ...incomeRows,
      {
        id: 'total-income',
        section: 'Income',
        lineItem: 'Total Income',
        amount: financeReport.overallBusinessReport?.totalIncome || 0,
        tone: 'summary'
      },
      ...expenseRows,
      {
        id: 'total-expenses',
        section: 'Expense',
        lineItem: 'Total Expenses',
        amount: -(financeReport.overallBusinessReport?.totalExpenses || 0),
        tone: 'summary'
      },
      {
        id: 'net-profit-loss',
        section: 'Result',
        lineItem:
          (financeReport.overallBusinessReport?.netProfit || 0) >= 0 ? 'Net Profit' : 'Net Loss',
        amount: financeReport.overallBusinessReport?.netProfit || 0,
        tone: 'result'
      }
    ];
  }, [financeReport]);

  const profitLossColumns = useMemo(
    () => [
      {
        key: 'section',
        header: 'Section',
        accessor: (item) => item.section || '',
        cell: (item) => (
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {item.section}
          </span>
        )
      },
      {
        key: 'lineItem',
        header: 'Line Item',
        accessor: (item) => item.lineItem || '',
        cell: (item) => (
          <span
            className={`font-semibold ${
              item.tone === 'summary' || item.tone === 'result'
                ? 'text-slate-950'
                : 'text-slate-700'
            }`}
          >
            {item.lineItem}
          </span>
        )
      },
      {
        key: 'amount',
        header: 'Amount',
        accessor: (item) => item.amount || 0,
        exportValue: (item) => formatCurrency(item.amount || 0),
        cell: (item) => (
          <span
            className={`font-semibold ${
              item.amount > 0
                ? 'text-emerald-700'
                : item.amount < 0
                  ? 'text-brand-orange'
                  : 'text-slate-600'
            }`}
          >
            {formatCurrency(item.amount || 0)}
          </span>
        )
      }
    ],
    []
  );

  const paymentColumns = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        accessor: (item) => `${item.userId?.name || ''} ${item.userId?.email || ''}`,
        cell: (item) => (
          <div>
            <p className="font-semibold text-slate-900">{item.userId?.name || 'Unknown user'}</p>
            <p className="text-slate-500">{item.userId?.email || '-'}</p>
          </div>
        )
      },
      { key: 'event', header: 'Event', accessor: (item) => item.eventId?.name || '', cell: (item) => <span className="text-slate-600">{item.eventId?.name || '-'}</span> },
      { key: 'amount', header: 'Amount', accessor: (item) => item.amount || 0, exportValue: (item) => formatCurrency(item.amount), cell: (item) => <span className="text-slate-600">{formatCurrency(item.amount)}</span> },
      { key: 'status', header: 'Status', accessor: (item) => item.status || '', cell: (item) => <span className="badge bg-white text-slate-700">{item.status}</span> },
      { key: 'createdAt', header: 'Created', accessor: (item) => item.createdAt, sortValue: (item) => new Date(item.createdAt).getTime(), exportValue: (item) => formatDateTime(item.createdAt), cell: (item) => <span className="text-slate-600">{formatDateTime(item.createdAt)}</span> }
    ],
    []
  );

  const activityColumns = useMemo(
    () => [
      { key: 'createdAt', header: 'When', accessor: (item) => item.createdAt, sortValue: (item) => new Date(item.createdAt).getTime(), exportValue: (item) => formatDateTime(item.createdAt), cell: (item) => <span className="text-slate-600">{formatDateTime(item.createdAt)}</span> },
      {
        key: 'summary',
        header: 'Summary',
        accessor: (item) => item.summary || '',
        exportValue: (item) => `${item.summary || ''} ${item.details || ''}`.trim(),
        cell: (item) => (
          <div>
            <p className="font-semibold text-slate-900">{item.summary}</p>
            {item.details ? <p className="mt-1 text-xs text-slate-500">{item.details}</p> : null}
          </div>
        )
      },
      { key: 'category', header: 'Category', accessor: (item) => item.category || '', cell: (item) => <span className="text-slate-600">{item.category}</span> },
      { key: 'performedBy', header: 'Actor', accessor: (item) => item.performedBy?.name || item.performedBy?.username || 'System', cell: (item) => <span className="text-slate-600">{item.performedBy?.name || item.performedBy?.username || 'System'}</span> }
    ],
    []
  );

  const securityColumns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Alert',
        accessor: (item) => item.title || '',
        exportValue: (item) => `${item.title || ''} ${item.message || ''}`.trim(),
        cell: (item) => (
          <div className="flex items-start gap-3">
            <div
              className={`rounded-2xl p-2 ${
                item.severity === 'critical'
                  ? 'bg-red-100 text-red-600'
                  : item.severity === 'high'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-sky-100 text-sky-700'
              }`}
            >
              <AppIcon className="h-4 w-4" name={getAlertIconName(item)} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.message}</p>
            </div>
          </div>
        )
      },
      {
        key: 'category',
        header: 'Category',
        accessor: (item) => item.category || 'security',
        cell: (item) => (
          <span className="badge bg-slate-100 text-slate-600">
            {alertCategoryLabels[item.category || 'security'] || item.category || 'security'}
          </span>
        )
      },
      {
        key: 'severity',
        header: 'Severity',
        accessor: (item) => item.severity || '',
        cell: (item) => (
          <span className={`badge ${item.severity === 'critical' ? 'bg-red-50 text-red-600' : item.severity === 'high' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
            {item.severity}
          </span>
        )
      },
      {
        key: 'context',
        header: 'Context',
        accessor: (item) => `${getAlertContextLines(item).join(' ')} ${item.subjectType || ''}`,
        exportValue: (item) => getAlertContextLines(item).join(' | '),
        cell: (item) => (
          <div className="text-slate-600">
            {getAlertContextLines(item).length ? (
              getAlertContextLines(item).map((line) => (
                <p className="mt-1 first:mt-0 text-xs" key={`${item._id}-${line}`}>
                  {line}
                </p>
              ))
            ) : (
              <p className="text-xs">No extra context recorded.</p>
            )}
          </div>
        )
      },
      { key: 'lastSeenAt', header: 'Last Seen', accessor: (item) => item.lastSeenAt, sortValue: (item) => new Date(item.lastSeenAt).getTime(), exportValue: (item) => formatDateTime(item.lastSeenAt), cell: (item) => <span className="text-slate-600">{formatDateTime(item.lastSeenAt)}</span> },
      {
        key: 'actions',
        header: 'Action',
        accessor: () => '',
        exportable: false,
        sortable: false,
        cell: (item) =>
          item.status === 'open' ? (
            <button
              className="btn-secondary gap-2 px-4 py-2"
              disabled={acknowledgingId === item._id}
              onClick={async () => {
                setAcknowledgingId(item._id);
                try {
                  await acknowledgeSecurityAlert(item._id);
                  setSecurityAlerts(
                    await getSecurityAlerts({
                      page: securityPage,
                      limit: securityLimit,
                      status: securityStatus,
                      severity: securitySeverity,
                      category: securityCategory
                    })
                  );
                } catch (requestError) {
                  setError(getApiErrorMessage(requestError, 'Unable to acknowledge this alert.'));
                } finally {
                  setAcknowledgingId('');
                }
              }}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="check" />
              {acknowledgingId === item._id ? 'Saving...' : 'Acknowledge'}
            </button>
          ) : (
            <span className="text-sm text-slate-500">Acknowledged</span>
          )
      }
    ],
    [acknowledgingId, securityCategory, securityLimit, securityPage, securitySeverity, securityStatus]
  );

  const activePaymentConfig = paymentStatusTabs.find((tab) => tab.key === activePaymentTab) || paymentStatusTabs[0];
  const activePaymentRows = financeReport.paymentStatusReport?.[activePaymentConfig.rowKey] || [];
  const financeEventOptions = [
    { value: '', label: 'All Events' },
    ...financeEvents.map((event) => ({
      value: event._id,
      label: event.name
    }))
  ];
  const financeScopeOptions = [
    { value: '', label: 'All Scopes' },
    ...Object.entries(transactionScopeLabels).map(([optionValue, label]) => ({
      value: optionValue,
      label
    }))
  ];
  const securityStatusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'acknowledged', label: 'Acknowledged' }
  ];
  const securitySeverityOptions = [
    { value: '', label: 'All Severities' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];
  const securityCategoryOptions = [
    { value: '', label: 'All Categories' },
    ...Object.entries(alertCategoryLabels).map(([value, label]) => ({
      value,
      label
    }))
  ];

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
  };

  const handleFinanceFilterChange = (event) => {
    const { name, value } = event.target;
    setFinanceDraftFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === 'scope' && value === 'common') {
        next.eventId = '';
      }
      return next;
    });
  };

  const applyFinanceFilters = async (event) => {
    event.preventDefault();

    if (!financeDraftFilters.dateFrom || !financeDraftFilters.dateTo) {
      setError('Select both From and To dates before loading finance reports.');
      return;
    }

    if (new Date(financeDraftFilters.dateFrom) > new Date(financeDraftFilters.dateTo)) {
      setError('Finance From date must be before or equal to To date.');
      return;
    }

    setFinanceLoading(true);
    try {
      const nextFilters = { ...financeDraftFilters };
      setFinanceActiveFilters(nextFilters);
      setFinanceReport(await getAccountingReports(buildFinanceParams(nextFilters)));
      setHasAppliedFinanceFilters(true);
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to refresh finance reports.'));
    } finally {
      setFinanceLoading(false);
    }
  };

  const handleExportOverview = async () => {
    setExportingOverview(true);
    try {
      downloadBlob(await downloadReportsOverview(), 'reports-overview.csv');
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to export overview reports.'));
    } finally {
      setExportingOverview(false);
    }
  };

  const handleExportFinance = async () => {
    if (!hasAppliedFinanceFilters) {
      setError('Apply a finance date range before exporting reports.');
      return;
    }

    setExportingFinance(true);
    try {
      downloadBlob(await downloadAccountingReports(buildFinanceParams(financeActiveFilters)), 'finance-reports.csv');
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to export finance reports.'));
    } finally {
      setExportingFinance(false);
    }
  };

  const resetFinanceFilters = () => {
    setFinanceDraftFilters(createFinanceFilters());
    setFinanceActiveFilters(createFinanceFilters());
    setFinanceReport(defaultFinanceReport);
    setHasAppliedFinanceFilters(false);
    setError('');
  };

  const handleExportHistory = async () => {
    if (!hasAppliedActivityFilters) {
      setError('Apply a date range before exporting operational history.');
      return;
    }

    setExportingHistory(true);
    try {
      downloadBlob(await downloadActivityLogs(activityActiveFilters), 'activity-history.csv');
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to export activity history.'));
    } finally {
      setExportingHistory(false);
    }
  };

  const applyActivityFilters = async (event) => {
    event.preventDefault();

    if (!activityDraftFilters.dateFrom || !activityDraftFilters.dateTo) {
      setError('Select both From and To dates before loading operational history.');
      return;
    }

    if (new Date(activityDraftFilters.dateFrom) > new Date(activityDraftFilters.dateTo)) {
      setError('Activity From date must be before or equal to To date.');
      return;
    }

    setActivityLoading(true);
    try {
      const nextFilters = { ...activityDraftFilters };
      const response = await getActivityLogs({
        ...nextFilters,
        page: 1,
        limit: activityLimit
      });

      setActivityActiveFilters(nextFilters);
      setHasAppliedActivityFilters(true);
      setActivityPage(1);
      setActivityLogData(response);
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load activity history right now.'));
    } finally {
      setActivityLoading(false);
    }
  };

  const resetActivityFilters = () => {
    setActivityDraftFilters(createActivityFilters());
    setActivityActiveFilters(createActivityFilters());
    setActivityLogData({ items: [], totalCount: 0 });
    setActivityPage(1);
    setHasAppliedActivityFilters(false);
    setError('');
  };

  return (
    <AdminPageShell
      description="A single reporting workspace for event performance, financial analysis, operational history, and critical alert visibility."
      title="Reports Hub"
    >
      <FormAlert message={error} />
      <div className="mb-8 inline-flex w-full rounded-[1.75rem] bg-white p-2 shadow-soft lg:w-auto">
        {[
          { key: 'overview', label: 'Overview', icon: 'reports', visible: canViewOverview },
          { key: 'finance', label: 'Finance', icon: 'accounting', visible: canViewFinance },
          { key: 'activity', label: 'Activity', icon: 'chart', visible: canViewOverview },
          { key: 'security', label: 'Alerts', icon: 'bell', visible: canViewSecurity }
        ]
          .filter((tab) => tab.visible)
          .map((tab) => (
            <button
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.key ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-brand-mist'
              }`}
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              type="button"
            >
              <AppIcon className="h-4 w-4" name={tab.icon} />
              {tab.label}
            </button>
          ))}
      </div>

      {activeTab === 'overview' ? (
        overviewLoading && !overviewLoaded ? (
          <LoadingSpinner label="Loading overview reports..." />
        ) : (
          <>
            <div className="mb-6 flex justify-end">
              <button className="btn-secondary gap-2" disabled={exportingOverview} onClick={handleExportOverview} type="button">
                <AppIcon className="h-4 w-4" name="export" />
                {exportingOverview ? 'Exporting...' : 'Export Overview'}
              </button>
            </div>
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="panel p-6">
                <h2 className="text-2xl font-bold">Event Metrics</h2>
                <div className="mt-6">
                  <DataTable
                    columns={eventMetricColumns}
                    emptyMessage="No event metrics are available yet."
                    exportFileName="event-metrics.csv"
                    rowKey={(item) => item._id || item.name}
                    rows={overview.eventMetrics}
                    searchPlaceholder="Search event metrics"
                  />
                </div>
              </section>
              <section className="panel p-6">
                <h2 className="text-2xl font-bold">Participation Analytics</h2>
                <div className="mt-6 space-y-4">
                  {overview.sportTypeAnalytics.length ? (
                    overview.sportTypeAnalytics.map((item) => (
                      <div className="rounded-3xl bg-slate-50 p-5" key={item._id}>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">{item._id}</p>
                        <p className="mt-3 text-3xl font-bold text-slate-950">{item.totalRegistrations}</p>
                        <p className="mt-2 text-sm text-slate-500">Registrations across events in this sport.</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No participation analytics are available yet.</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )
      ) : null}

      {activeTab === 'finance' ? (
        <>
          <form onSubmit={applyFinanceFilters}>
            <AdminFilterPanel
              actions={
                <>
                  <button className="btn-primary gap-2" disabled={financeLoading} type="submit">
                    <AppIcon className="h-4 w-4" name="refresh" />
                    {financeLoading ? 'Refreshing...' : 'Load Finance'}
                  </button>
                  <button className="btn-secondary gap-2" disabled={financeLoading} onClick={resetFinanceFilters} type="button">
                    Reset
                  </button>
                  <button className="btn-secondary gap-2" disabled={exportingFinance} onClick={handleExportFinance} type="button">
                    <AppIcon className="h-4 w-4" name="export" />
                    {exportingFinance ? 'Exporting...' : 'Export Finance'}
                  </button>
                </>
              }
              description="The finance range defaults to today through the next 30 days. Load the report only after the date range and scope are correct."
              gridClassName="xl:grid-cols-[1fr_1fr_1.4fr_1fr]"
              title="Finance Filters"
            >
              <div>
                <label className="label" htmlFor="finance-dateFrom">From</label>
                <input className="input" id="finance-dateFrom" name="dateFrom" onChange={handleFinanceFilterChange} type="date" value={financeDraftFilters.dateFrom} />
              </div>
              <div>
                <label className="label" htmlFor="finance-dateTo">To</label>
                <input className="input" id="finance-dateTo" name="dateTo" onChange={handleFinanceFilterChange} type="date" value={financeDraftFilters.dateTo} />
              </div>
              <div>
                <label className="label" htmlFor="finance-eventId">Event</label>
                <TypeaheadSelect disabled={financeDraftFilters.scope === 'common' || financeEventsLoading} id="finance-eventId" name="eventId" onChange={handleFinanceFilterChange} options={financeEventOptions} placeholder="All Events" searchPlaceholder="Search events" value={financeDraftFilters.eventId} />
              </div>
              <div>
                <label className="label" htmlFor="finance-scope">Scope</label>
                <TypeaheadSelect id="finance-scope" name="scope" onChange={handleFinanceFilterChange} options={financeScopeOptions} placeholder="All Scopes" searchPlaceholder="Search scopes" value={financeDraftFilters.scope} />
              </div>
            </AdminFilterPanel>
          </form>

          {financeEventsLoading ? <LoadingSpinner compact label="Loading finance filters..." /> : null}
          {financeLoading ? <LoadingSpinner compact label="Loading finance reports..." /> : null}

          {!hasAppliedFinanceFilters ? (
            <div className="panel p-6">
              <p className="text-sm text-slate-500">
                Select a date range and apply filters to load finance reports.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 xl:grid-cols-3">
                <StatCard helper="Credits" icon="revenue" subtitle="Total income in the current finance filter." title="Income" tone="emerald" value={formatCurrency(financeReport.overallBusinessReport.totalIncome)} />
                <StatCard helper="Debits" icon="accounting" subtitle="Total expenses in the current finance filter." title="Expenses" tone="orange" value={formatCurrency(financeReport.overallBusinessReport.totalExpenses)} />
                <StatCard helper="Net" icon="trendUp" subtitle="Income minus expenses." title="Profit / Loss" tone="blue" value={formatCurrency(financeReport.overallBusinessReport.netProfit)} />
              </div>

              <div className="mt-8 grid gap-8 xl:grid-cols-2">
                <BreakdownChart emptyMessage="No income categories have been recorded for the selected scope." items={financeReport.incomeReport.breakdown} title="Income Breakdown" tone="income" />
                <BreakdownChart emptyMessage="No expense categories have been recorded for the selected scope." items={financeReport.expenseReport.breakdown} title="Expense Breakdown" tone="expense" />
              </div>

              <section className="panel mt-8 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Profit &amp; Loss Statement</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      A finance summary of income lines, expense lines, and the closing result for
                      the current filters.
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      (financeReport.overallBusinessReport?.netProfit || 0) >= 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {(financeReport.overallBusinessReport?.netProfit || 0) >= 0
                      ? 'Profit'
                      : 'Loss'}
                  </span>
                </div>
                <div className="mt-6">
                  <DataTable
                    columns={profitLossColumns}
                    emptyMessage="Profit and loss lines will appear once finance data is available."
                    exportFileName="profit-loss-statement.csv"
                    rowKey="id"
                    rows={profitLossRows}
                    searchPlaceholder="Search profit and loss lines"
                  />
                </div>
              </section>

              <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="panel p-6">
                  <h2 className="text-2xl font-bold">Event Profit Report</h2>
                  <div className="mt-6">
                    <DataTable columns={financeEventColumns} emptyMessage="Profit data will appear here once transactions are recorded." exportFileName="event-profit-report.csv" rowKey={(item) => item.eventId || item.eventName} rows={financeReport.eventProfitReport} searchPlaceholder="Search finance by event" />
                  </div>
                </section>
                <section className="panel p-6">
                  <h2 className="text-2xl font-bold">Date-wise Report</h2>
                  <div className="mt-6">
                    <DataTable columns={financeDateColumns} emptyMessage="Date-wise summaries will appear after transactions are added." exportFileName="date-wise-report.csv" rowKey="_id" rows={financeReport.dateWiseReport.timeline} searchPlaceholder="Search finance timeline" />
                  </div>
                </section>
              </div>

              <section className="panel mt-8 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Payment Status Review</h2>
                    <p className="mt-2 text-sm text-slate-500">Large payment queues stay manageable here with separate tabs, search, sorting, export, and pagination.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {paymentStatusTabs.map((tab) => (
                      <button className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activePaymentTab === tab.key ? 'bg-brand-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-brand-mist'}`} key={tab.key} onClick={() => setActivePaymentTab(tab.key)} type="button">
                        <span className="block">{tab.label}</span>
                        <span className="mt-1 block text-xs font-medium opacity-80">{financeReport.paymentStatusReport.counts[tab.key] || 0} records</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-8">
                  <DataTable columns={paymentColumns} emptyMessage="No payments match this status for the selected finance filter." exportFileName={`${activePaymentConfig.rowKey}.csv`} headerClassName={activePaymentConfig.tone.headerClassName} rowKey="_id" rows={activePaymentRows} searchPlaceholder={`Search ${activePaymentConfig.label.toLowerCase()}`} shellClassName={activePaymentConfig.tone.shellClassName} tableClassName="min-w-[980px]" toolbarClassName={activePaymentConfig.tone.toolbarClassName} />
                </div>
              </section>
            </>
          )}
        </>
      ) : null}

      {activeTab === 'activity' ? (
        <section className="panel p-6">
          <form onSubmit={applyActivityFilters}>
            <AdminFilterPanel
              actions={
                <>
                  <button className="btn-primary gap-2" disabled={activityLoading} type="submit">
                    <AppIcon className="h-4 w-4" name="refresh" />
                    {activityLoading ? 'Loading...' : 'Load History'}
                  </button>
                  <button className="btn-secondary gap-2" disabled={activityLoading} onClick={resetActivityFilters} type="button">
                    Reset
                  </button>
                  <button className="btn-secondary gap-2" disabled={exportingHistory} onClick={handleExportHistory} type="button">
                    <AppIcon className="h-4 w-4" name="export" />
                    {exportingHistory ? 'Exporting...' : 'Export History'}
                  </button>
                </>
              }
              description="Use the default 30-day range or narrow it before loading the operational history trail."
              gridClassName="xl:grid-cols-2"
              title="Operational History"
            >
              <div>
                <label className="label" htmlFor="activity-dateFrom">From</label>
                <input className="input" id="activity-dateFrom" name="dateFrom" onChange={(event) => setActivityDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))} type="date" value={activityDraftFilters.dateFrom} />
              </div>
              <div>
                <label className="label" htmlFor="activity-dateTo">To</label>
                <input className="input" id="activity-dateTo" name="dateTo" onChange={(event) => setActivityDraftFilters((current) => ({ ...current, dateTo: event.target.value }))} type="date" value={activityDraftFilters.dateTo} />
              </div>
            </AdminFilterPanel>
          </form>

          {activityLoading ? <LoadingSpinner compact label="Loading activity history..." /> : null}

          {!hasAppliedActivityFilters ? (
            <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Select a date range and apply filters to load operational history.
            </p>
          ) : (
            <div className="mt-6">
              <DataTable columns={activityColumns} emptyMessage="No activity history is available yet." exportButtonLabel="Export This Page" exportFileName="activity-history-page.csv" rowKey="_id" rows={activityLogData.items} searchPlaceholder="Search activity history" serverPagination={{ page: activityLogData.page || activityPage, pageSize: activityLogData.limit || activityLimit, totalCount: activityLogData.totalCount || 0, onPageChange: setActivityPage, onPageSizeChange: (nextLimit) => { setActivityLimit(nextLimit); setActivityPage(1); } }} />
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'security' ? (
        securityLoading && !securityLoaded ? (
          <LoadingSpinner label="Loading alerts..." />
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-3">
              <StatCard helper="Active" icon="warning" subtitle="Admin alerts currently open." title="Open Alerts" tone={securityAlerts.openCount ? 'rose' : 'slate'} value={securityAlerts.openCount || 0} />
              <StatCard helper="Queue" icon="bell" subtitle="Filtered alerts in the current view." title="Visible Alerts" tone="orange" value={securityAlerts.totalCount || 0} />
              <StatCard helper="Monitoring" icon="security" subtitle="Critical contact, payment, and API events flow through this alert queue." title="Alert Delivery" tone="blue" value="Enabled" />
            </div>
            <section className="panel mt-8 p-6">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Critical Alerts</h2>
                  <p className="mt-2 text-sm text-slate-500">Contact submissions, pending or failed payment events, and suspicious API activity are captured here.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label" htmlFor="security-status">Status</label>
                    <TypeaheadSelect id="security-status" onChange={(event) => { setSecurityStatus(event.target.value); setSecurityPage(1); }} options={securityStatusOptions} placeholder="Filter status" searchPlaceholder="Search statuses" value={securityStatus} />
                  </div>
                  <div>
                    <label className="label" htmlFor="security-severity">Severity</label>
                    <TypeaheadSelect id="security-severity" onChange={(event) => { setSecuritySeverity(event.target.value); setSecurityPage(1); }} options={securitySeverityOptions} placeholder="All Severities" searchPlaceholder="Search severities" value={securitySeverity} />
                  </div>
                  <div>
                    <label className="label" htmlFor="security-category">Category</label>
                    <TypeaheadSelect id="security-category" onChange={(event) => { setSecurityCategory(event.target.value); setSecurityPage(1); }} options={securityCategoryOptions} placeholder="All Categories" searchPlaceholder="Search categories" value={securityCategory} />
                  </div>
                </div>
              </div>
              <DataTable columns={securityColumns} emptyMessage="No alerts match the current filters." exportable={false} rowKey="_id" rows={securityAlerts.items} searchPlaceholder="Search alerts" serverPagination={{ page: securityAlerts.page || securityPage, pageSize: securityAlerts.limit || securityLimit, totalCount: securityAlerts.totalCount || 0, onPageChange: setSecurityPage, onPageSizeChange: (nextLimit) => { setSecurityLimit(nextLimit); setSecurityPage(1); } }} tableClassName="min-w-[1240px]" />
            </section>
          </>
        )
      ) : null}
    </AdminPageShell>
  );
}
