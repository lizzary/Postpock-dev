import { useMemo } from 'react';
import { syncActions } from '../../../bridge/index.js';
import { useT } from '../../../i18n/index.jsx';
import { toast } from '../../components/feedback.jsx';

export function useSyncSubmit() {
  const t = useT();
  return async (type, items) => {
    const res = await syncActions.submit(type, items);
    if (!res.accepted) { toast(t('sync.nothing'), { tone: 'warn' }); return false; }
    toast(t(type === 'sync' ? 'sync.submittedSync' : 'sync.submittedUpdate', { n: res.accepted }), { tone: 'ok', icon: type === 'sync' ? 'sync' : 'layers' });
    return true;
  };
}

export function useStatusCounts(lists) {
  return useMemo(() => {
    const c = { all: 0, synced: 0, unsynced: 0, expired: 0, updated: 0 };
    for (const l of lists) for (const i of l.items) { c.all++; c[i.status]++; }
    return c;
  }, [lists]);
}
