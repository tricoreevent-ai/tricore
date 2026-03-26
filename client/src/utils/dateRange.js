const toDateInputValue = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

// Default: last 30 days, ending today
export const getDefaultDateRangeValues = (referenceDate = new Date(), daysBack = 30) => ({
  dateFrom: toDateInputValue(addDays(referenceDate, -Math.abs(daysBack))),
  dateTo: toDateInputValue(referenceDate)
});

export const createDefaultDateRangeFilters = (extraFilters = {}, referenceDate = new Date(), daysBack = 30) => ({
  ...getDefaultDateRangeValues(referenceDate, daysBack),
  ...extraFilters
});

export const toDateInputString = toDateInputValue;
