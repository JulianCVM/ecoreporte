import { useEffect, useState } from 'react';

import type { UploadEntry } from '../domain/upload-queue';
import { onUploadQueueState } from './upload-queue';
import { loadUploadQueue } from './upload-queue-store';

/** La cola de subida, al día: cambia cuando entra o sale una foto y al terminar cada pasada. */
export function useUploadEntries(): UploadEntry[] {
  const [entries, setEntries] = useState<UploadEntry[]>(loadUploadQueue);

  useEffect(() => onUploadQueueState(() => setEntries(loadUploadQueue())), []);

  return entries;
}
