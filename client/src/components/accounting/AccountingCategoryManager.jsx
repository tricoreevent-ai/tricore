import DataTable from '../common/DataTable.jsx';
import FormAlert from '../common/FormAlert.jsx';
import TypeaheadSelect from '../common/TypeaheadSelect.jsx';

const categoryTypeOptions = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' }
];

export default function AccountingCategoryManager({
  categories,
  editingCategory,
  errorMessage,
  loading = false,
  onCancelEdit,
  onDelete,
  onEdit,
  onFormChange,
  onSubmit,
  saving = false,
  successMessage,
  values
}) {
  const categoryColumns = [
    {
      key: 'label',
      header: 'Category',
      accessor: (category) => category.label,
      cell: (category) => (
        <div>
          <p className="font-semibold text-slate-900">{category.label}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            {category.key}
          </p>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (category) => category.type,
      cell: (category) => (
        <span
          className={`badge ${
            category.type === 'income'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-orange-50 text-brand-orange'
          }`}
        >
          {category.type}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: () => '',
      exportable: false,
      sortable: false,
      cell: (category) => (
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary px-4 py-2" onClick={() => onEdit(category)} type="button">
            Edit
          </button>
          <button
            className="btn-primary px-4 py-2"
            onClick={() => onDelete(category)}
            type="button"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Accounting Category Repository</h3>
          <p className="mt-2 text-sm text-slate-500">
            Maintain one clean category list for the ledger, reports, filters, and transaction entry.
          </p>
        </div>
        <DataTable
          columns={categoryColumns}
          emptyMessage="No accounting categories are available."
          exportButtonLabel="Export Categories"
          exportFileName="accounting-categories.csv"
          loading={loading}
          loadingLabel="Loading categories..."
          rowKey="key"
          rows={categories}
          searchPlaceholder="Search categories"
        />
      </div>

      <form className="panel space-y-5 p-6" onSubmit={onSubmit}>
        <div>
          <h3 className="text-xl font-bold">
            {editingCategory ? 'Edit Category' : 'Add Category'}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Duplicate labels are blocked automatically to keep every dropdown and report clean.
          </p>
        </div>

        <FormAlert message={errorMessage} />
        <FormAlert message={successMessage} type="success" />

        <div>
          <label className="label" htmlFor="categoryLabel">
            Category Name
          </label>
          <input
            className="input"
            id="categoryLabel"
            name="label"
            onChange={onFormChange}
            placeholder="Enter category name"
            required
            value={values.label}
          />
        </div>

        <div>
          <label className="label" htmlFor="categoryType">
            Transaction Type
          </label>
          <TypeaheadSelect
            id="categoryType"
            name="type"
            onChange={onFormChange}
            options={categoryTypeOptions}
            placeholder="Select category type"
            searchPlaceholder="Search types"
            value={values.type}
          />
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
          New categories become available instantly across accounting forms and filters after saving.
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" disabled={saving} type="submit">
            {saving
              ? editingCategory
                ? 'Updating...'
                : 'Saving...'
              : editingCategory
                ? 'Update Category'
                : 'Add Category'}
          </button>
          {editingCategory ? (
            <button className="btn-secondary" onClick={onCancelEdit} type="button">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
