// Phase 35: reading the open findings from local storage. Kept apart from photoRepo.ts
// so that screens which only show a count (the home screen) do not pull in the AI
// client and the sync triggers.

import type { PhotoFindingRow } from '@spatenstich/shared';
import { storage } from '../../storage';

/** The findings of a garden, newest check first; by default only the open ones. */
export async function loadFindings(gardenId: string, opts: { all?: boolean } = {}): Promise<PhotoFindingRow[]> {
  const rows = await storage.getRowsByGarden<PhotoFindingRow>('photo_findings', gardenId);
  return rows
    .filter((row) => opts.all || row.status === 'open')
    .sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : b.createdAt.localeCompare(a.createdAt)));
}

export async function countOpenFindings(gardenId: string): Promise<number> {
  return (await loadFindings(gardenId)).length;
}
