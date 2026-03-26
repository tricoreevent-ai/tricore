export const transactionTypes = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' }
];

export const fallbackAccountingCategories = [
  { key: 'registration', label: 'Registration', type: 'income' },
  { key: 'sponsorship', label: 'Sponsorship', type: 'income' },
  { key: 'advertisement', label: 'Advertisement', type: 'income' },
  { key: 'donation', label: 'Donation', type: 'income' },
  { key: 'partner_share', label: 'Partner Share', type: 'income' },
  { key: 'other_income', label: 'Other Income', type: 'income' },
  { key: 'venue', label: 'Venue Cost', type: 'expense' },
  { key: 'equipment', label: 'Equipment Cost', type: 'expense' },
  { key: 'staff', label: 'Staff / Umpire', type: 'expense' },
  { key: 'marketing', label: 'Marketing', type: 'expense' },
  { key: 'prize', label: 'Prize / Trophies', type: 'expense' },
  { key: 'food', label: 'Food / Hospitality', type: 'expense' },
  { key: 'administrative', label: 'Administrative Expense', type: 'expense' },
  { key: 'vendor_payment', label: 'Vendor Payment', type: 'expense' },
  { key: 'organizer_payout', label: 'Organizer Payout', type: 'expense' },
  { key: 'partner_distribution', label: 'Partner Distribution', type: 'expense' },
  { key: 'miscellaneous', label: 'Miscellaneous', type: 'expense' },
  { key: 'other_expense', label: 'Other Expense', type: 'expense' }
];

export const paymentModeLabels = {
  online: 'Online',
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank Transfer'
};

export const sourceLabels = {
  manual: 'Manual Entry',
  payment: 'Auto Payment'
};

export const transactionScopeLabels = {
  event: 'Event Based',
  common: 'Common Ledger'
};

export const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const getResolvedCategories = (categories = []) =>
  Array.isArray(categories) && categories.length ? categories : fallbackAccountingCategories;

export const buildCategoryLabels = (categories = []) =>
  getResolvedCategories(categories).reduce((accumulator, category) => {
    accumulator[category.key] = category.label;
    return accumulator;
  }, {});

export const getCategoryValuesForType = (categories = [], type = '') => {
  const resolvedCategories = getResolvedCategories(categories);

  if (type === 'expense' || type === 'income') {
    return resolvedCategories
      .filter((category) => category.type === type)
      .map((category) => category.key);
  }

  return resolvedCategories.map((category) => category.key);
};

export const getCategoryOptions = (categories = [], type = '') =>
  getResolvedCategories(categories)
    .filter((category) => !type || category.type === type)
    .map((category) => ({
      value: category.key,
      label: category.label
    }));

export const getCategoryLabel = (categories = [], categoryKey = '') =>
  buildCategoryLabels(categories)[categoryKey] || categoryKey;

export const getDefaultCategoryForType = (categories = [], type = 'income') => {
  const matchingCategory = getResolvedCategories(categories).find((category) => category.type === type);
  return matchingCategory?.key || '';
};

export const buildAccountingCategoryGroups = (categories = []) => {
  const resolvedCategories = getResolvedCategories(categories);

  return ['income', 'expense'].map((type) => ({
    label: type === 'income' ? 'Income Categories' : 'Expense Categories',
    options: resolvedCategories
      .filter((category) => category.type === type)
      .map((category) => ({
        value: category.key,
        label: category.label
      }))
  }));
};
