import { AppSetting } from '../models/AppSetting.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';

export const ACCOUNTING_CATEGORIES_KEY = 'accounting-categories';

const categoryTypes = ['income', 'expense'];
const reservedCategoryKeys = ['registration'];
const legacyCategoryKeyMap = {
  other: 'other_income'
};

const defaultAccountingCategories = [
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

const normalizeText = (value) => String(value || '').trim();
const normalizeLabel = (value) => normalizeText(value).replace(/\s+/g, ' ');
const normalizeLabelKey = (value) => normalizeLabel(value).toLowerCase();
const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const slugifyCategoryKey = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');

const titleizeCategoryKey = (value) =>
  normalizeText(value)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const sortCategories = (categories = []) =>
  [...categories].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'income' ? -1 : 1;
    }

    return left.label.localeCompare(right.label, 'en', {
      numeric: true,
      sensitivity: 'base'
    });
  });

const sanitizeCategory = (category = {}) => {
  const normalizedType = categoryTypes.includes(category?.type) ? category.type : 'income';
  const rawKey = slugifyCategoryKey(category?.key || category?.label);
  const key = legacyCategoryKeyMap[rawKey] || rawKey;
  const label = normalizeLabel(category?.label || titleizeCategoryKey(key));

  if (!key || !label) {
    return null;
  }

  return {
    key,
    label,
    type: normalizedType
  };
};

const dedupeCategories = (categories = []) => {
  const seenKeys = new Set();
  const seenLabels = new Set();

  return categories.reduce((accumulator, category) => {
    const sanitized = sanitizeCategory(category);

    if (!sanitized) {
      return accumulator;
    }

    const normalizedLabel = normalizeLabelKey(sanitized.label);

    if (seenKeys.has(sanitized.key) || seenLabels.has(normalizedLabel)) {
      return accumulator;
    }

    seenKeys.add(sanitized.key);
    seenLabels.add(normalizedLabel);
    accumulator.push(sanitized);
    return accumulator;
  }, []);
};

const buildAccountingCategorySettingValue = (stored = {}) => {
  const storedCategories = Array.isArray(stored?.categories) ? stored.categories : [];
  const mergedCategories = dedupeCategories([...storedCategories, ...defaultAccountingCategories]);

  return {
    categories: sortCategories(mergedCategories)
  };
};

const hasCategoryType = (categories, type) => categories.some((category) => category.type === type);

const serializeAccountingCategorySettings = (settingDocument) => {
  const merged = buildAccountingCategorySettingValue(settingDocument?.value || {});
  const labelsByKey = merged.categories.reduce((accumulator, category) => {
    accumulator[category.key] = category.label;
    return accumulator;
  }, {});

  return {
    categories: merged.categories,
    labelsByKey,
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesDefaultSeed: !settingDocument
  };
};

let legacyCategoryMigrationPromise = null;

const migrateLegacyTransactionCategories = async () => {
  await Transaction.updateMany(
    { category: 'other' },
    {
      $set: {
        category: 'other_income'
      }
    }
  );
};

const ensureLegacyTransactionCategoryMigration = async () => {
  if (!legacyCategoryMigrationPromise) {
    legacyCategoryMigrationPromise = migrateLegacyTransactionCategories().catch((error) => {
      legacyCategoryMigrationPromise = null;
      throw error;
    });
  }

  return legacyCategoryMigrationPromise;
};

export const ensureAccountingCategorySettingDocument = async () => {
  await ensureLegacyTransactionCategoryMigration();

  const existing = await AppSetting.findOne({ key: ACCOUNTING_CATEGORIES_KEY });
  const nextValue = buildAccountingCategorySettingValue(existing?.value || {});

  if (!existing) {
    return populateUpdatedBy(
      AppSetting.findOneAndUpdate(
        { key: ACCOUNTING_CATEGORIES_KEY },
        {
          key: ACCOUNTING_CATEGORIES_KEY,
          value: nextValue
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true
        }
      )
    );
  }

  if (JSON.stringify(existing.value || {}) === JSON.stringify(nextValue)) {
    return populateUpdatedBy(AppSetting.findOne({ key: ACCOUNTING_CATEGORIES_KEY }));
  }

  return populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: ACCOUNTING_CATEGORIES_KEY },
      {
        $set: {
          value: nextValue
        }
      },
      {
        new: true,
        runValidators: true
      }
    )
  );
};

export const getAccountingCategorySettings = async () =>
  serializeAccountingCategorySettings(await ensureAccountingCategorySettingDocument());

export const getAccountingCategories = async ({ type } = {}) => {
  const settings = await getAccountingCategorySettings();

  if (!type) {
    return settings.categories;
  }

  return settings.categories.filter((category) => category.type === type);
};

export const getAccountingCategoryLabelMap = async () => {
  const settings = await getAccountingCategorySettings();
  return settings.labelsByKey;
};

export const getAccountingCategoryLabel = async (key) => {
  const labelsByKey = await getAccountingCategoryLabelMap();
  return labelsByKey[String(key || '').trim()] || String(key || '').trim();
};

export const validateTransactionCategory = async (type, category) => {
  const normalizedType = String(type || '').trim();
  const normalizedCategory = String(category || '').trim();
  const categories = await getAccountingCategories({ type: normalizedType });

  if (!categories.some((item) => item.key === normalizedCategory)) {
    throw new ApiError(
      400,
      `Category "${normalizedCategory}" is not valid for ${normalizedType} transactions.`
    );
  }
};

const ensureUniqueAccountingCategory = (categories, { key, label }, excludedKey = '') => {
  const normalizedExcludedKey = String(excludedKey || '').trim();
  const normalizedLabel = normalizeLabelKey(label);

  if (
    categories.some(
      (category) => category.key === key && category.key !== normalizedExcludedKey
    )
  ) {
    throw new ApiError(409, `Category key "${key}" already exists.`);
  }

  if (
    categories.some(
      (category) =>
        normalizeLabelKey(category.label) === normalizedLabel &&
        category.key !== normalizedExcludedKey
    )
  ) {
    throw new ApiError(409, `Category label "${label}" already exists.`);
  }
};

const countCategoriesByType = (categories, type) =>
  categories.filter((category) => category.type === type).length;

const normalizeCategoryPayload = (payload = {}) => {
  const label = normalizeLabel(payload.label);
  const type = categoryTypes.includes(payload.type) ? payload.type : '';

  if (!label) {
    throw new ApiError(400, 'Category label is required.');
  }

  if (!type) {
    throw new ApiError(400, 'Category type must be income or expense.');
  }

  return {
    key: legacyCategoryKeyMap[slugifyCategoryKey(payload.key || label)] || slugifyCategoryKey(payload.key || label),
    label,
    type
  };
};

export const createAccountingCategory = async ({ payload, userId }) => {
  const existing = await ensureAccountingCategorySettingDocument();
  const currentValue = buildAccountingCategorySettingValue(existing?.value || {});
  const nextCategory = normalizeCategoryPayload(payload);

  ensureUniqueAccountingCategory(currentValue.categories, nextCategory);

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: ACCOUNTING_CATEGORIES_KEY },
      {
        key: ACCOUNTING_CATEGORIES_KEY,
        value: {
          categories: sortCategories([...currentValue.categories, nextCategory])
        },
        updatedBy: userId
      },
      {
        new: true,
        runValidators: true
      }
    )
  );

  return serializeAccountingCategorySettings(updated);
};

export const updateAccountingCategory = async ({ key, payload, userId }) => {
  const normalizedKey = legacyCategoryKeyMap[slugifyCategoryKey(key)] || slugifyCategoryKey(key);
  const existing = await ensureAccountingCategorySettingDocument();
  const currentValue = buildAccountingCategorySettingValue(existing?.value || {});
  const existingCategory = currentValue.categories.find((category) => category.key === normalizedKey);

  if (!existingCategory) {
    throw new ApiError(404, 'Accounting category not found.');
  }

  const nextCategory = {
    ...existingCategory,
    ...normalizeCategoryPayload({
      key: normalizedKey,
      label: payload.label ?? existingCategory.label,
      type: payload.type ?? existingCategory.type
    }),
    key: normalizedKey
  };

  if (
    reservedCategoryKeys.includes(normalizedKey) &&
    nextCategory.type !== existingCategory.type
  ) {
    throw new ApiError(400, 'Reserved accounting categories cannot change transaction type.');
  }

  const transactionCount = await Transaction.countDocuments({ category: normalizedKey });

  if (transactionCount > 0 && nextCategory.type !== existingCategory.type) {
    throw new ApiError(400, 'Categories already used in transactions cannot change transaction type.');
  }

  ensureUniqueAccountingCategory(currentValue.categories, nextCategory, normalizedKey);

  const updatedCategories = currentValue.categories.map((category) =>
    category.key === normalizedKey ? nextCategory : category
  );

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: ACCOUNTING_CATEGORIES_KEY },
      {
        key: ACCOUNTING_CATEGORIES_KEY,
        value: {
          categories: sortCategories(updatedCategories)
        },
        updatedBy: userId
      },
      {
        new: true,
        runValidators: true
      }
    )
  );

  return serializeAccountingCategorySettings(updated);
};

export const deleteAccountingCategory = async ({ key, userId }) => {
  const normalizedKey = legacyCategoryKeyMap[slugifyCategoryKey(key)] || slugifyCategoryKey(key);
  const existing = await ensureAccountingCategorySettingDocument();
  const currentValue = buildAccountingCategorySettingValue(existing?.value || {});
  const category = currentValue.categories.find((item) => item.key === normalizedKey);

  if (!category) {
    throw new ApiError(404, 'Accounting category not found.');
  }

  if (reservedCategoryKeys.includes(normalizedKey)) {
    throw new ApiError(400, 'Reserved accounting categories cannot be deleted.');
  }

  const transactionCount = await Transaction.countDocuments({ category: normalizedKey });

  if (transactionCount > 0) {
    throw new ApiError(
      400,
      'This category is already used in transactions. Update the label instead of deleting it.'
    );
  }

  if (countCategoriesByType(currentValue.categories, category.type) <= 1) {
    throw new ApiError(400, `At least one ${category.type} category must remain.`);
  }

  const updatedCategories = currentValue.categories.filter((item) => item.key !== normalizedKey);

  if (!hasCategoryType(updatedCategories, 'income') || !hasCategoryType(updatedCategories, 'expense')) {
    throw new ApiError(400, 'At least one income and one expense category must remain.');
  }

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: ACCOUNTING_CATEGORIES_KEY },
      {
        key: ACCOUNTING_CATEGORIES_KEY,
        value: {
          categories: sortCategories(updatedCategories)
        },
        updatedBy: userId
      },
      {
        new: true,
        runValidators: true
      }
    )
  );

  return serializeAccountingCategorySettings(updated);
};
