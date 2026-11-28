import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { readStore, writeStore } from '../store.ts';
import type { CatchRecord } from '../types.ts';
import { validateCatchRecordInput } from '../validation/catchRecords.ts';

export async function getCatchRecords(_request: Request, response: Response): Promise<void> {
  const store = await readStore();
  response.json(store.catchRecords);
}

export async function createCatchRecord(request: Request, response: Response): Promise<void> {
  const input = validateCatchRecordInput(request.body);
  const store = await readStore();
  const record: CatchRecord = { id: randomUUID(), ...input };
  await writeStore({ catchRecords: [...store.catchRecords, record] });
  response.status(201).json(record);
}

export async function updateCatchRecord(request: Request, response: Response): Promise<void> {
  const input = validateCatchRecordInput(request.body);
  const id = getIdParam(request);
  const store = await readStore();
  const index = store.catchRecords.findIndex((record) => record.id === id);
  if (index < 0) {
    response.status(404).json({ message: 'Catch record not found' });
    return;
  }

  const updated: CatchRecord = { id, ...input };
  const catchRecords = [...store.catchRecords];
  catchRecords[index] = updated;
  await writeStore({ catchRecords });
  response.json(updated);
}

export async function deleteCatchRecord(request: Request, response: Response): Promise<void> {
  const id = getIdParam(request);
  const store = await readStore();
  const index = store.catchRecords.findIndex((record) => record.id === id);
  if (index < 0) {
    response.status(404).json({ message: 'Catch record not found' });
    return;
  }

  const catchRecords = store.catchRecords.filter((record) => record.id !== id);
  await writeStore({ catchRecords });
  response.status(204).send();
}

function getIdParam(request: Request): string {
  const param = request.params.id;
  if (typeof param !== 'string') {
    throw new Error('Invalid id param');
  }
  return param;
}
