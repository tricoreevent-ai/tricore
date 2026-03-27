import { useEffect, useMemo, useState } from 'react';

import { downloadBlob } from '../../utils/download.js';
import AppIcon from './AppIcon.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import TypeaheadSelect from './TypeaheadSelect.jsx';

const defaultPageSizeOptions = [10, 20, 50, 100];

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return String(value).trim();
};

const getRawColumnValue = (column, row) => {
  if (typeof column.sortValue === 'function') {
    return column.sortValue(row);
  }

  if (typeof column.accessor === 'function') {
    return column.accessor(row);
  }

  return row?.[column.key];
};

const getExportColumnValue = (column, row) => {
  if (typeof column.exportValue === 'function') {
    return column.exportValue(row);
  }

  return getRawColumnValue(column, row);
};

const getSearchableText = (columns, row) =>
  columns
    .map((column) => {
      if (typeof column.searchValue === 'function') {
        return column.searchValue(row);
      }

      return getExportColumnValue(column, row);
    })
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ');

const escapeCsvValue = (value) => {
  const normalized = String(value ?? '');

  if (normalized.includes('"') || normalized.includes(',') || normalized.includes('\n')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
};

const buildCsvContent = (columns, rows) => {
  const exportableColumns = columns.filter((column) => column.exportable !== false);
  const headerRow = exportableColumns.map((column) => escapeCsvValue(column.header)).join(',');
  const bodyRows = rows.map((row) =>
    exportableColumns
      .map((column) => escapeCsvValue(getExportColumnValue(column, row)))
      .join(',')
  );

  return [headerRow, ...bodyRows].join('\n');
};

const compareValues = (left, right) => {
  const normalizedLeft = normalizeValue(left);
  const normalizedRight = normalizeValue(right);

  if (typeof normalizedLeft === 'number' && typeof normalizedRight === 'number') {
    return normalizedLeft - normalizedRight;
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight), 'en', {
    numeric: true,
    sensitivity: 'base'
  });
};

export default function DataTable({
  columns,
  emptyMessage = 'No records found.',
  exportButtonLabel,
  exportFileName = 'table-export.csv',
  exportable = true,
  initialPageSize = 10,
  initialSort = null,
  loading = false,
  loadingLabel = 'Loading records...',
  pageSizeOptions = defaultPageSizeOptions,
  rowKey = 'id',
  rows,
  shellClassName = '',
  searchPlaceholder = 'Search this table',
  searchable = true,
  serverPagination = null,
  showMobileCards = true,
  toolbarClassName = '',
  tableClassName = '',
  headerClassName = '',
  toolbarActions = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortState, setSortState] = useState(initialSort);
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(initialPageSize);

  useEffect(() => {
    setLocalPage(1);
  }, [searchTerm]);

  const processedRows = useMemo(() => {
    const normalizedRows = Array.isArray(rows) ? [...rows] : [];
    const trimmedSearch = searchTerm.trim().toLowerCase();
    const filteredRows = trimmedSearch
      ? normalizedRows.filter((row) => getSearchableText(columns, row).includes(trimmedSearch))
      : normalizedRows;

    if (!sortState?.key) {
      return filteredRows;
    }

    const column = columns.find((item) => item.key === sortState.key);

    if (!column) {
      return filteredRows;
    }

    return [...filteredRows].sort((left, right) => {
      const direction = sortState.direction === 'desc' ? -1 : 1;
      return compareValues(getRawColumnValue(column, left), getRawColumnValue(column, right)) * direction;
    });
  }, [columns, rows, searchTerm, sortState]);

  const currentPage = serverPagination?.page || localPage;
  const currentPageSize = serverPagination?.pageSize || localPageSize;
  const localTotalPages = Math.max(1, Math.ceil(processedRows.length / currentPageSize));

  useEffect(() => {
    if (!serverPagination && localPage > localTotalPages) {
      setLocalPage(localTotalPages);
    }
  }, [localPage, localTotalPages, serverPagination]);

  const visibleRows = serverPagination
    ? processedRows
    : processedRows.slice((currentPage - 1) * currentPageSize, currentPage * currentPageSize);
  const totalCount = serverPagination?.totalCount ?? processedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize));
  const rangeStart = totalCount ? (currentPage - 1) * currentPageSize + (visibleRows.length ? 1 : 0) : 0;
  const rangeEnd = totalCount
    ? Math.min((currentPage - 1) * currentPageSize + visibleRows.length, totalCount)
    : 0;
  const filteredPageCount = processedRows.length;

  const handleSortToggle = (column) => {
    if (column.sortable === false) {
      return;
    }

    setSortState((current) => {
      if (!current || current.key !== column.key) {
        return { key: column.key, direction: 'asc' };
      }

      if (current.direction === 'asc') {
        return { key: column.key, direction: 'desc' };
      }

      return null;
    });
  };

  const handleExport = () => {
    const csvContent = buildCsvContent(columns, processedRows);
    downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }), exportFileName);
  };

  const handlePageSizeChange = (nextValue) => {
    const parsed = Number.parseInt(nextValue, 10) || initialPageSize;

    if (serverPagination?.onPageSizeChange) {
      serverPagination.onPageSizeChange(parsed);
      return;
    }

    setLocalPageSize(parsed);
    setLocalPage(1);
  };

  const handlePageChange = (nextPage) => {
    const boundedPage = Math.min(Math.max(1, nextPage), totalPages);

    if (serverPagination?.onPageChange) {
      serverPagination.onPageChange(boundedPage);
      return;
    }

    setLocalPage(boundedPage);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white ${shellClassName}`.trim()}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 backdrop-blur-sm">
          <LoadingSpinner compact label={loadingLabel} />
        </div>
      ) : null}
      <div
        className={`flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between ${toolbarClassName}`.trim()}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>
            Showing {rangeStart}-{rangeEnd} of {totalCount}
          </span>
          {serverPagination && searchTerm.trim() ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              {filteredPageCount} matches on this page
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {searchable ? (
            <input
              className="input min-w-[220px] bg-white sm:min-w-[220px]"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={serverPagination ? `${searchPlaceholder} (current page)` : searchPlaceholder}
              value={searchTerm}
            />
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="text-sm text-slate-600" htmlFor={`page-size-${exportFileName}`}>
              Rows
            </label>
            <TypeaheadSelect
              className="min-w-[96px]"
              compact
              id={`page-size-${exportFileName}`}
              onChange={(event) => handlePageSizeChange(event.target.value)}
              options={pageSizeOptions.map((value) => ({
                value,
                label: String(value)
              }))}
              placeholder="Rows"
              searchPlaceholder="Rows"
              value={currentPageSize}
            />
            {toolbarActions}
            {exportable ? (
              <button className="btn-secondary w-full gap-2 sm:w-auto" onClick={handleExport} type="button">
                <AppIcon className="h-4 w-4" name="export" />
                {exportButtonLabel || (serverPagination ? 'Export This Page' : 'Export CSV')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {showMobileCards ? (
        <div className="space-y-3 p-4 md:hidden">
          {visibleRows.length ? (
            visibleRows.map((row, rowIndex) => {
              const resolvedKey =
                typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey] || `${rowIndex}`;

              return (
                <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={resolvedKey}>
                  <div className="space-y-3">
                    {columns.map((column) => (
                      <div className="rounded-2xl bg-white px-4 py-3" key={`${resolvedKey}-${column.key}`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {column.header}
                        </p>
                        <div className="mt-2 text-sm text-slate-700">
                          {typeof column.cell === 'function'
                            ? column.cell(row)
                            : getExportColumnValue(column, row) || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              {emptyMessage}
            </div>
          )}
        </div>
      ) : null}

      <div className={`${showMobileCards ? 'hidden md:block' : ''} w-full overflow-x-auto`.trim()}>
        <table className={`min-w-full text-left text-sm ${tableClassName}`.trim()}>
          <thead className={`bg-white ${headerClassName}`.trim()}>
            <tr className="border-b border-slate-200 text-slate-500">
              {columns.map((column) => {
                const isSorted = sortState?.key === column.key;
                const sortTone = isSorted ? 'text-slate-900' : 'text-slate-500';

                return (
                  <th
                    className={`px-5 py-4 font-semibold ${column.headerClassName || ''}`.trim()}
                    key={column.key}
                  >
                    <button
                      className={`inline-flex items-center gap-2 ${column.sortable === false ? 'cursor-default' : 'cursor-pointer'} ${sortTone}`.trim()}
                      onClick={() => handleSortToggle(column)}
                      type="button"
                    >
                      <span>{column.header}</span>
                      {column.sortable === false ? null : (
                        <span className="text-xs">
                          {isSorted ? (sortState.direction === 'desc' ? '▼' : '▲') : '↕'}
                        </span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleRows.length ? (
              visibleRows.map((row, rowIndex) => {
                const resolvedKey =
                  typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey] || `${rowIndex}`;

                return (
                  <tr className="border-b border-slate-100 align-top last:border-b-0" key={resolvedKey}>
                    {columns.map((column) => (
                      <td
                        className={`px-5 py-4 ${column.cellClassName || ''}`.trim()}
                        key={`${resolvedKey}-${column.key}`}
                      >
                        {typeof column.cell === 'function'
                          ? column.cell(row)
                          : getExportColumnValue(column, row) || '-'}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-5 py-6 text-slate-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-slate-600">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            className="btn-secondary w-full gap-2 px-4 py-2 sm:w-auto"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            type="button"
          >
            <AppIcon className="h-4 w-4" name="chevronLeft" />
            Previous
          </button>
          <button
            className="btn-secondary w-full gap-2 px-4 py-2 sm:w-auto"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            type="button"
          >
            Next
            <AppIcon className="h-4 w-4" name="chevronRight" />
          </button>
        </div>
      </div>
    </div>
  );
}
