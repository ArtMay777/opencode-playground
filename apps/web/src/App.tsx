import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ApiRequestError,
  createCatchRecord,
  deleteCatchRecord,
  fetchCatchRecords,
  isApiFieldError,
  updateCatchRecord,
} from './api.ts';
import type { CatchRecord, CatchRecordInput, FishCategory, FishCategoryFilter } from './types.ts';
import {
  calculateCatchStatistics,
  filterCatchRecords,
  formatTotalWeightKg,
  sortCatchRecords,
} from './utils/catchRecords.ts';

const FISH_CATEGORY_OPTIONS: Array<{ value: FishCategoryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'predatory', label: 'Predatory' },
  { value: 'non-predatory', label: 'Non-predatory' },
];

const FORM_FISH_CATEGORY_OPTIONS: Array<{ value: FishCategory; label: string }> = [
  { value: 'predatory', label: 'Predatory' },
  { value: 'non-predatory', label: 'Non-predatory' },
];

interface CatchRecordFormValues {
  caughtAt: string;
  anglerName: string;
  fishCategory: FishCategory;
  fishSpecies: string;
  fishCount: string;
  totalWeightKg: string;
}

type FormErrors = Partial<Record<keyof CatchRecordInput | 'body', string>>;

const EMPTY_FORM: CatchRecordFormValues = {
  caughtAt: '',
  anglerName: '',
  fishCategory: 'predatory',
  fishSpecies: '',
  fishCount: '',
  totalWeightKg: '',
};

function formatFishCategory(category: CatchRecord['fishCategory']): string {
  return category === 'predatory' ? 'Predatory' : 'Non-predatory';
}

function toFormValues(record: CatchRecord): CatchRecordFormValues {
  return {
    caughtAt: record.caughtAt,
    anglerName: record.anglerName,
    fishCategory: record.fishCategory,
    fishSpecies: record.fishSpecies,
    fishCount: String(record.fishCount),
    totalWeightKg: String(record.totalWeightKg),
  };
}

function toInput(values: CatchRecordFormValues): CatchRecordInput {
  const fishCount = values.fishCount.trim() === '' ? Number.NaN : Number(values.fishCount);
  const totalWeightKg = values.totalWeightKg.trim() === '' ? Number.NaN : Number(values.totalWeightKg);
  return {
    caughtAt: values.caughtAt,
    anglerName: values.anglerName,
    fishCategory: values.fishCategory,
    fishSpecies: values.fishSpecies,
    fishCount,
    totalWeightKg,
  };
}

function getMutationErrorMessage(error: unknown, action: 'save' | 'delete'): string {
  if (error instanceof ApiRequestError && error.status === 404) {
    return 'Catch record not found';
  }
  return action === 'delete'
    ? 'Could not delete catch record. Please try again.'
    : 'Could not save catch record. Please try again.';
}

export default function App() {
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<FishCategoryFilter>('all');
  const [formValues, setFormValues] = useState<CatchRecordFormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCatchRecords = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const nextRecords = await fetchCatchRecords(signal);
      if (signal?.aborted) return;
      setRecords(nextRecords);
    } catch {
      if (signal?.aborted) return;
      setLoadError(true);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      await loadCatchRecords(controller.signal);
    };
    void run();
    return () => controller.abort();
  }, [loadCatchRecords]);

  const visibleRecords = useMemo(() => {
    const sorted = sortCatchRecords(records);
    return filterCatchRecords(sorted, filter);
  }, [records, filter]);

  const statistics = useMemo(() => calculateCatchStatistics(visibleRecords), [visibleRecords]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setFormMessage(null);
  }, []);

  const handleFieldChange = (field: keyof CatchRecordFormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as keyof FormErrors];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});
    setFormMessage(null);
    const input = toInput(formValues);

    try {
      if (editingId) {
        await updateCatchRecord(editingId, input);
      } else {
        await createCatchRecord(input);
      }
      resetForm();
      await loadCatchRecords();
    } catch (error: unknown) {
      if (error instanceof ApiRequestError && error.status === 400 && isApiFieldError(error.body)) {
        if (error.body.field === 'body') {
          setFormMessage(error.body.message);
        } else {
          setFormErrors({ [error.body.field as keyof FormErrors]: error.body.message });
        }
      } else {
        setFormMessage(getMutationErrorMessage(error, 'save'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (record: CatchRecord) => {
    setEditingId(record.id);
    setFormValues(toFormValues(record));
    setFormErrors({});
    setFormMessage(null);
  };

  const handleDelete = async (record: CatchRecord) => {
    const confirmed = window.confirm('Delete this catch record?');
    if (!confirmed) return;

    setIsSubmitting(true);
    setFormErrors({});
    setFormMessage(null);
    try {
      await deleteCatchRecord(record.id);
      if (editingId === record.id) {
        resetForm();
      }
      await loadCatchRecords();
    } catch (error: unknown) {
      setFormMessage(getMutationErrorMessage(error, 'delete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRecordsTable = !isLoading && (!loadError || records.length > 0) && visibleRecords.length > 0;
  const showEmptyNoRecords = !isLoading && !loadError && visibleRecords.length === 0 && filter === 'all';
  const showEmptyCategory = !isLoading && !loadError && visibleRecords.length === 0 && filter !== 'all';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Angler Journal</h1>

        <section
          aria-labelledby="catch-form-heading"
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id="catch-form-heading" className="text-lg font-semibold">
            {editingId ? 'Edit catch record' : 'Add catch record'}
          </h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="caughtAt">
                Caught at
              </label>
              <input
                id="caughtAt"
                name="caughtAt"
                type="text"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formValues.caughtAt}
                onChange={(event) => handleFieldChange('caughtAt', event.target.value)}
                aria-describedby={formErrors.caughtAt ? 'caughtAt-error' : undefined}
              />
              {formErrors.caughtAt && (
                <p id="caughtAt-error" className="mt-1 text-sm text-red-700">
                  {formErrors.caughtAt}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="anglerName">
                Angler
              </label>
              <input
                id="anglerName"
                name="anglerName"
                type="text"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formValues.anglerName}
                onChange={(event) => handleFieldChange('anglerName', event.target.value)}
                aria-describedby={formErrors.anglerName ? 'anglerName-error' : undefined}
              />
              {formErrors.anglerName && (
                <p id="anglerName-error" className="mt-1 text-sm text-red-700">
                  {formErrors.anglerName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="fishCategory">
                Fish category
              </label>
              <select
                id="fishCategory"
                name="fishCategory"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formValues.fishCategory}
                onChange={(event) => handleFieldChange('fishCategory', event.target.value)}
                aria-describedby={formErrors.fishCategory ? 'fishCategory-error' : undefined}
              >
                {FORM_FISH_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formErrors.fishCategory && (
                <p id="fishCategory-error" className="mt-1 text-sm text-red-700">
                  {formErrors.fishCategory}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="fishSpecies">
                Fish species
              </label>
              <input
                id="fishSpecies"
                name="fishSpecies"
                type="text"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formValues.fishSpecies}
                onChange={(event) => handleFieldChange('fishSpecies', event.target.value)}
                aria-describedby={formErrors.fishSpecies ? 'fishSpecies-error' : undefined}
              />
              {formErrors.fishSpecies && (
                <p id="fishSpecies-error" className="mt-1 text-sm text-red-700">
                  {formErrors.fishSpecies}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="fishCount">
                Fish count
              </label>
              <input
                id="fishCount"
                name="fishCount"
                type="text"
                inputMode="numeric"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formValues.fishCount}
                onChange={(event) => handleFieldChange('fishCount', event.target.value)}
                aria-describedby={formErrors.fishCount ? 'fishCount-error' : undefined}
              />
              {formErrors.fishCount && (
                <p id="fishCount-error" className="mt-1 text-sm text-red-700">
                  {formErrors.fishCount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="totalWeightKg">
                Total weight
              </label>
              <input
                id="totalWeightKg"
                name="totalWeightKg"
                type="text"
                inputMode="decimal"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formValues.totalWeightKg}
                onChange={(event) => handleFieldChange('totalWeightKg', event.target.value)}
                aria-describedby={formErrors.totalWeightKg ? 'totalWeightKg-error' : undefined}
              />
              {formErrors.totalWeightKg && (
                <p id="totalWeightKg-error" className="mt-1 text-sm text-red-700">
                  {formErrors.totalWeightKg}
                </p>
              )}
            </div>

            {formMessage && (
              <p className="sm:col-span-2 text-sm text-red-700" role="alert">
                {formMessage}
              </p>
            )}

            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={isSubmitting}
              >
                {editingId ? 'Save changes' : 'Add catch record'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section
          aria-labelledby="catch-statistics-heading"
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id="catch-statistics-heading" className="text-lg font-semibold">
            Catch statistics
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-slate-500">Total fish count</dt>
              <dd className="text-2xl font-semibold">{statistics.totalFishCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Total weight</dt>
              <dd className="text-2xl font-semibold">{formatTotalWeightKg(statistics.totalWeightKg)}</dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="catch-records-heading"
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="catch-records-heading" className="text-lg font-semibold">
              Catch records
            </h2>
            <label className="text-sm font-medium text-slate-700">
              Fish category filter
              <select
                className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={filter}
                onChange={(event) => setFilter(event.target.value as FishCategoryFilter)}
              >
                {FISH_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div role="status" aria-live="polite" className="mt-4">
            {isLoading && <p>Loading catch records...</p>}
            {loadError && (
              <div>
                <p>Could not load catch records</p>
                <button
                  type="button"
                  className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => void loadCatchRecords()}
                >
                  Retry
                </button>
              </div>
            )}
            {showEmptyNoRecords && <p>No catch records yet</p>}
            {showEmptyCategory && <p>No records in this fish category</p>}
          </div>

          {showRecordsTable && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 font-semibold">Caught at</th>
                    <th className="px-2 py-2 font-semibold">Angler</th>
                    <th className="px-2 py-2 font-semibold">Fish category</th>
                    <th className="px-2 py-2 font-semibold">Fish species</th>
                    <th className="px-2 py-2 font-semibold">Fish count</th>
                    <th className="px-2 py-2 font-semibold">Total weight</th>
                    <th className="px-2 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record, index) => {
                    const ordinal = index + 1;
                    return (
                      <tr
                        key={record.id}
                        data-testid={`catch-record-${record.id}`}
                        className="border-b border-slate-100"
                      >
                        <td className="px-2 py-2">{record.caughtAt}</td>
                        <td className="px-2 py-2">{record.anglerName}</td>
                        <td className="px-2 py-2">{formatFishCategory(record.fishCategory)}</td>
                        <td className="px-2 py-2">{record.fishSpecies}</td>
                        <td className="px-2 py-2">{record.fishCount}</td>
                        <td className="px-2 py-2">{formatTotalWeightKg(record.totalWeightKg)}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium"
                              aria-label={`Edit ${record.fishSpecies} caught on ${record.caughtAt}, record ${ordinal}`}
                              onClick={() => handleEdit(record)}
                              disabled={isSubmitting}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                              aria-label={`Delete ${record.fishSpecies} caught on ${record.caughtAt}, record ${ordinal}`}
                              onClick={() => void handleDelete(record)}
                              disabled={isSubmitting}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
