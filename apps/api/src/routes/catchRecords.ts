import type { Request, Response } from 'express';
import { readStore } from '../store.ts';

export async function getCatchRecords(_request: Request, response: Response): Promise<void> {
  const store = await readStore();
  response.json(store.catchRecords);
}
