import { expect, test } from '@playwright/test';

test('angler journal MVP flow: seed list, filter, add, edit, delete', async ({ page }) => {
  await page.goto('/');

  // 1) Fresh seed data loads and shows expected all-record statistics.
  await expect(page.getByRole('heading', { name: 'Angler Journal' })).toBeVisible();

  await expect(page.getByText('44', { exact: true })).toBeVisible();
  await expect(page.getByText('43.0 kg', { exact: true })).toBeVisible();
  await expect(page.getByTestId('catch-record-seed-1')).toBeVisible();
  await expect(page.getByTestId('catch-record-seed-10')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(11); // header + 10 records

  // 2) Filter by fish category and verify documented filtered statistics.
  const filter = page.getByLabel('Fish category filter');
  await expect(filter).toHaveValue('all');

  await filter.selectOption('predatory');
  await expect(page.getByRole('row')).toHaveCount(6); // header + 5
  await expect(page.getByText('20', { exact: true })).toBeVisible();
  await expect(page.getByText('14.3 kg', { exact: true })).toBeVisible();

  await filter.selectOption('non-predatory');
  await expect(page.getByRole('row')).toHaveCount(6); // header + 5
  await expect(page.getByText('24', { exact: true })).toBeVisible();
  await expect(page.getByText('28.7 kg', { exact: true })).toBeVisible();

  await filter.selectOption('all');
  await expect(page.getByRole('row')).toHaveCount(11);
  await expect(page.getByText('44', { exact: true })).toBeVisible();
  await expect(page.getByText('43.0 kg', { exact: true })).toBeVisible();

  // 3) Add a valid catch record and verify it appears.
  await page.getByLabel('Caught at').fill('2026-06-23');
  await page.getByLabel('Angler', { exact: true }).fill('Oleksii');
  await page.getByLabel('Fish category', { exact: true }).selectOption('predatory');
  await page.getByLabel('Fish species', { exact: true }).fill('pike');
  await page.getByLabel('Fish count', { exact: true }).fill('2');
  await page.getByLabel('Total weight', { exact: true }).fill('3.4');
  await page.getByRole('button', { name: 'Add catch record' }).click();

  const addedRow = page.getByRole('row').filter({ hasText: '2026-06-23' }).filter({ hasText: 'Oleksii' });
  await expect(addedRow).toBeVisible();
  await expect(addedRow).toContainText('Predatory');
  await expect(addedRow).toContainText('pike');
  await expect(addedRow).toContainText('3.4 kg');
  await expect(page.getByRole('row')).toHaveCount(12);
  await expect(page.getByText('46', { exact: true })).toBeVisible();
  await expect(page.getByText('46.4 kg', { exact: true })).toBeVisible();

  // 4) Edit that record and verify the changed values.
  await addedRow.getByRole('button', { name: /Edit pike caught on 2026-06-23, record \d+/ }).click();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  await page.getByLabel('Angler', { exact: true }).fill('Maksym');
  await page.getByLabel('Fish count', { exact: true }).fill('1');
  await page.getByLabel('Total weight', { exact: true }).fill('5.0');
  await page.getByRole('button', { name: 'Save changes' }).click();

  const editedRow = page.getByRole('row').filter({ hasText: '2026-06-23' }).filter({ hasText: 'Maksym' });
  await expect(editedRow).toBeVisible();
  await expect(editedRow).toContainText('1');
  await expect(editedRow).toContainText('5.0 kg');
  await expect(page.getByRole('row').filter({ hasText: '2026-06-23' }).filter({ hasText: 'Oleksii' })).toHaveCount(0);
  await expect(page.getByText('45', { exact: true })).toBeVisible();
  await expect(page.getByText('48.0 kg', { exact: true })).toBeVisible();

  // 5) Delete it and verify it is removed and the expected data/statistics remain.
  page.once('dialog', (dialog) => dialog.accept());
  await editedRow.getByRole('button', { name: /Delete pike caught on 2026-06-23, record \d+/ }).click();

  await expect(page.getByRole('row').filter({ hasText: '2026-06-23' })).toHaveCount(0);
  await expect(page.getByRole('row')).toHaveCount(11);
  await expect(page.getByText('44', { exact: true })).toBeVisible();
  await expect(page.getByText('43.0 kg', { exact: true })).toBeVisible();
  await expect(page.getByTestId('catch-record-seed-1')).toBeVisible();
  await expect(page.getByTestId('catch-record-seed-10')).toBeVisible();
});
