import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App.tsx';
import type { CatchRecord } from './types.ts';

const seedRecords: CatchRecord[] = [
  {
    id: 'seed-1',
    anglerName: 'Oleksii',
    caughtAt: '2026-04-12',
    fishCategory: 'predatory',
    fishSpecies: 'pike',
    fishCount: 2,
    totalWeightKg: 3.4,
  },
  {
    id: 'seed-2',
    anglerName: 'Andrii',
    caughtAt: '2026-04-19',
    fishCategory: 'non-predatory',
    fishSpecies: 'carp',
    fishCount: 3,
    totalWeightKg: 5.8,
  },
  {
    id: 'seed-3',
    anglerName: 'Oleksii',
    caughtAt: '2026-05-03',
    fishCategory: 'predatory',
    fishSpecies: 'perch',
    fishCount: 7,
    totalWeightKg: 1.6,
  },
  {
    id: 'seed-4',
    anglerName: 'Maksym',
    caughtAt: '2026-05-10',
    fishCategory: 'non-predatory',
    fishSpecies: 'crucian carp',
    fishCount: 12,
    totalWeightKg: 4.2,
  },
  {
    id: 'seed-5',
    anglerName: 'Andrii',
    caughtAt: '2026-05-17',
    fishCategory: 'predatory',
    fishSpecies: 'zander',
    fishCount: 1,
    totalWeightKg: 2.1,
  },
  {
    id: 'seed-6',
    anglerName: 'Ihor',
    caughtAt: '2026-05-24',
    fishCategory: 'non-predatory',
    fishSpecies: 'bream',
    fishCount: 6,
    totalWeightKg: 3.7,
  },
  {
    id: 'seed-7',
    anglerName: 'Oleksii',
    caughtAt: '2026-06-01',
    fishCategory: 'predatory',
    fishSpecies: 'pike',
    fishCount: 1,
    totalWeightKg: 4.9,
  },
  {
    id: 'seed-8',
    anglerName: 'Maksym',
    caughtAt: '2026-06-08',
    fishCategory: 'non-predatory',
    fishSpecies: 'silver carp',
    fishCount: 2,
    totalWeightKg: 8.6,
  },
  {
    id: 'seed-9',
    anglerName: 'Ihor',
    caughtAt: '2026-06-15',
    fishCategory: 'predatory',
    fishSpecies: 'perch',
    fishCount: 9,
    totalWeightKg: 2.3,
  },
  {
    id: 'seed-10',
    anglerName: 'Andrii',
    caughtAt: '2026-06-22',
    fishCategory: 'non-predatory',
    fishSpecies: 'carp',
    fishCount: 1,
    totalWeightKg: 6.4,
  },
];

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { 'Content-Type': 'application/json' },
  });
}

function mockFetchByRoute(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    return Promise.resolve(handler(url, init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function fillForm(values: Partial<Record<string, string>>) {
  if (values.caughtAt !== undefined) fireEvent.change(screen.getByLabelText('Date'), { target: { value: values.caughtAt } });
  if (values.anglerName !== undefined) fireEvent.change(screen.getByLabelText('Angler'), { target: { value: values.anglerName } });
  if (values.fishCategory !== undefined) fireEvent.change(screen.getByLabelText('Fish category'), { target: { value: values.fishCategory } });
  if (values.fishSpecies !== undefined) fireEvent.change(screen.getByLabelText('Fish species'), { target: { value: values.fishSpecies } });
  if (values.fishCount !== undefined) fireEvent.change(screen.getByLabelText('Fish count'), { target: { value: values.fishCount } });
  if (values.totalWeightKg !== undefined) fireEvent.change(screen.getByLabelText('Total weight'), { target: { value: values.totalWeightKg } });
}

describe('App - catch records UI', () => {
  it('shows loading, then seeded records, and statistics for all records', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(seedRecords));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading catch records...');
    expect(await screen.findByText('43.0 kg')).toBeInTheDocument();

    expect(screen.getByText('Total fish count')).toBeInTheDocument();
    expect(screen.getByText('44')).toBeInTheDocument();
    expect(screen.getAllByText('Total weight').length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Angler' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Fish category' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Fish species' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Fish count' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Total weight' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    expect(within(rows[0]).getByText('2026-06-22')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Non-predatory')).toBeInTheDocument();
    expect(within(rows[9]).getByText('2026-04-12')).toBeInTheDocument();
    expect(screen.getByTestId('catch-record-seed-1')).toBeInTheDocument();
    expect(screen.queryByText('seed-1')).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith('/api/catch-records', expect.anything());
  });

  it('shows load failure and retries successfully', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(mockJsonResponse(seedRecords));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Could not load catch records')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('43.0 kg')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when there are no records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse([])));

    render(<App />);

    expect(await screen.findByText('No catch records yet')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0 kg')).toBeInTheDocument();
  });

  it('filters records and updates statistics for the selected fish category', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(seedRecords)));

    render(<App />);
    await screen.findByText('43.0 kg');

    const filter = screen.getByLabelText('Fish category filter');
    expect(filter).toHaveValue('all');

    fireEvent.change(filter, { target: { value: 'predatory' } });
    expect(screen.getAllByRole('row')).toHaveLength(6); // header + 5 predatory
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('14.3 kg')).toBeInTheDocument();

    fireEvent.change(filter, { target: { value: 'non-predatory' } });
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('28.7 kg')).toBeInTheDocument();
  });

  it('uses category-specific Fish species options and resets species on category change', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(seedRecords)));

    render(<App />);
    await screen.findByText('43.0 kg');

    const fishCategory = screen.getByLabelText('Fish category');
    const fishSpecies = screen.getByLabelText('Fish species');
    expect(fishSpecies.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Select fish species' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Pike' })).toHaveValue('pike');
    expect(screen.getByRole('option', { name: 'Perch' })).toHaveValue('perch');
    expect(screen.getByRole('option', { name: 'Zander' })).toHaveValue('zander');
    expect(screen.queryByRole('option', { name: 'Carp' })).not.toBeInTheDocument();

    fireEvent.change(fishSpecies, { target: { value: 'pike' } });
    expect(fishSpecies).toHaveValue('pike');

    fireEvent.change(fishCategory, { target: { value: 'non-predatory' } });
    expect(fishSpecies).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Crucian carp' })).toHaveValue('crucian carp');
    expect(screen.getByRole('option', { name: 'Carp' })).toHaveValue('carp');
    expect(screen.getByRole('option', { name: 'Bream' })).toHaveValue('bream');
    expect(screen.getByRole('option', { name: 'Silver carp' })).toHaveValue('silver carp');
    expect(screen.queryByRole('option', { name: 'Pike' })).not.toBeInTheDocument();
  });

  it('shows category empty state when filter has no matches', async () => {
    const predatoryOnly = seedRecords.filter((record) => record.fishCategory === 'predatory');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(predatoryOnly)));

    render(<App />);
    await screen.findByText('14.3 kg');

    fireEvent.change(screen.getByLabelText('Fish category filter'), { target: { value: 'non-predatory' } });
    expect(await screen.findByText('No records in this fish category')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0 kg')).toBeInTheDocument();
  });

  it('adds a record, refetches, and returns to Add mode', async () => {
    let records = [...seedRecords];
    const fetchMock = mockFetchByRoute((url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/api/catch-records') && method === 'GET') return mockJsonResponse(records);
      if (url.endsWith('/api/catch-records') && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as Omit<CatchRecord, 'id'>;
        const created: CatchRecord = { id: 'new-1', ...body };
        records = [...records, created];
        return mockJsonResponse(created, 201);
      }
      return mockJsonResponse({ message: 'Not found' }, 404);
    });

    render(<App />);
    await screen.findByText('43.0 kg');

    fillForm({
      caughtAt: '2026-06-23',
      anglerName: 'Oleksii',
      fishCategory: 'predatory',
      fishSpecies: 'pike',
      fishCount: '2',
      totalWeightKg: '3.4',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add catch record' }));

    await screen.findByTestId('catch-record-new-1');
    expect(fetchMock).toHaveBeenCalledWith('/api/catch-records', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByLabelText('Date')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add catch record' })).toBeInTheDocument();
  });

  it('shows inline 400 field error and form-level body error', async () => {
    let postCount = 0;
    mockFetchByRoute((url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/api/catch-records') && method === 'GET') return mockJsonResponse(seedRecords);
      if (url.endsWith('/api/catch-records') && method === 'POST') {
        postCount += 1;
        if (postCount === 1) {
          return mockJsonResponse({ field: 'fishSpecies', message: 'Fish species does not match the selected category' }, 400);
        }
        return mockJsonResponse({ field: 'body', message: 'Invalid request body' }, 400);
      }
      return mockJsonResponse({ message: 'Not found' }, 404);
    });

    render(<App />);
    await screen.findByText('43.0 kg');

    fillForm({ caughtAt: '2026-06-23', anglerName: 'A', fishCategory: 'predatory', fishSpecies: 'pike', fishCount: '1', totalWeightKg: '1' });
    fireEvent.click(screen.getByRole('button', { name: 'Add catch record' }));
    expect(await screen.findByText('Fish species does not match the selected category')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add catch record' }));
    expect(await screen.findByText('Invalid request body')).toBeInTheDocument();
  });

  it('edits a record with prefill, accessible names, save/cancel behavior', async () => {
    let records = [...seedRecords];
    mockFetchByRoute((url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/api/catch-records') && method === 'GET') return mockJsonResponse(records);
      if (url.includes('/api/catch-records/seed-1') && method === 'PUT') {
        const body = JSON.parse(String(init?.body)) as Omit<CatchRecord, 'id'>;
        records = records.map((r) => (r.id === 'seed-1' ? { id: 'seed-1', ...body } : r));
        return mockJsonResponse({ id: 'seed-1', ...body });
      }
      return mockJsonResponse({ message: 'Not found' }, 404);
    });

    render(<App />);
    await screen.findByText('43.0 kg');

    fireEvent.click(screen.getByRole('button', { name: 'Edit pike caught on 2026-04-12, record 10' }));
    expect(screen.getByLabelText('Date')).toHaveValue('2026-04-12');
    expect(screen.getByLabelText('Angler')).toHaveValue('Oleksii');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fish count'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Fish count')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add catch record' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit pike caught on 2026-04-12, record 10' }));
    fireEvent.change(screen.getByLabelText('Fish count'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Add catch record' })).toBeInTheDocument());
    expect(screen.getByLabelText('Fish count')).toHaveValue('');
  });

  it('handles delete confirm/cancel and delete form-state rules', async () => {
    let records = [
      { id: 'a', caughtAt: '2026-06-01', anglerName: 'A', fishCategory: 'predatory' as const, fishSpecies: 'pike', fishCount: 1, totalWeightKg: 1 },
      { id: 'b', caughtAt: '2026-05-01', anglerName: 'B', fishCategory: 'predatory' as const, fishSpecies: 'perch', fishCount: 1, totalWeightKg: 1 },
    ];
    const confirmSpy = vi.spyOn(window, 'confirm');
    mockFetchByRoute((url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/api/catch-records') && method === 'GET') return mockJsonResponse(records);
      if (url.includes('/api/catch-records/') && method === 'DELETE') {
        const id = url.split('/').pop()!;
        records = records.filter((r) => r.id !== id);
        return new Response(null, { status: 204 });
      }
      return mockJsonResponse({ message: 'Not found' }, 404);
    });

    render(<App />);
    await screen.findByText('2.0 kg');

    confirmSpy.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete pike caught on 2026-06-01, record 1' }));
    expect(screen.getByTestId('catch-record-a')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit pike caught on 2026-06-01, record 1' }));
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete perch caught on 2026-05-01, record 2' }));
    await waitFor(() => expect(screen.queryByTestId('catch-record-b')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument(); // editing another record preserved

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete pike caught on 2026-06-01, record 1' }));
    await waitFor(() => expect(screen.getByText('No catch records yet')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Add catch record' })).toBeInTheDocument();
  });

  it('shows save/delete failure messages and keeps list on failed mutation; refetch failure after success keeps list', async () => {
    let records = [...seedRecords];
    let getCount = 0;
    const fetchMock = mockFetchByRoute((url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/api/catch-records') && method === 'GET') {
        getCount += 1;
        if (getCount === 2) return mockJsonResponse({ message: 'Internal server error' }, 500);
        return mockJsonResponse(records);
      }
      if (url.endsWith('/api/catch-records') && method === 'POST') {
        return mockJsonResponse({ message: 'Internal server error' }, 500);
      }
      if (url.includes('/api/catch-records/seed-1') && method === 'DELETE') {
        records = records.filter((r) => r.id !== 'seed-1');
        return new Response(null, { status: 204 });
      }
      return mockJsonResponse({ message: 'Not found' }, 404);
    });

    render(<App />);
    await screen.findByText('43.0 kg');

    fillForm({ caughtAt: '2026-06-23', anglerName: 'A', fishCategory: 'predatory', fishSpecies: 'pike', fishCount: '1', totalWeightKg: '1' });
    fireEvent.click(screen.getByRole('button', { name: 'Add catch record' }));
    expect(await screen.findByText('Could not save catch record. Please try again.')).toBeInTheDocument();
    expect(screen.getByTestId('catch-record-seed-10')).toBeInTheDocument();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete carp caught on 2026-06-22, record 1' }));
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getAllByText('Could not load catch records').length).toBeGreaterThan(0);
    expect(screen.getByTestId('catch-record-seed-10')).toBeInTheDocument(); // last rendered list retained
    expect(screen.getByText('43.0 kg')).toBeInTheDocument();
    const deleteCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE');
    expect(deleteCalls).toHaveLength(1);
  });
});
