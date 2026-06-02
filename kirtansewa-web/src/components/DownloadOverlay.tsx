import { Loader2, Download, Check, AlertCircle, X } from 'lucide-react';
import { useDownloadStore } from '../store/downloadStore';

export function DownloadOverlay() {
  return (
    <>
      <BatchModal />
      <SingleToast />
    </>
  );
}

function BatchModal() {
  const batch = useDownloadStore((s) => s.batch);
  const cancelBatch = useDownloadStore((s) => s.cancelBatch);
  const dismissBatch = useDownloadStore((s) => s.dismissBatch);

  if (!batch) return null;

  const inProgress = batch.status === 'downloading' || batch.status === 'zipping';
  const pct = batch.total > 0 ? Math.round((batch.done / batch.total) * 100) : 0;
  const failedCount = batch.failedNames.length;

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-in">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-1">
            {batch.status === 'done' && failedCount === 0 && (
              <Check size={18} className="text-gold shrink-0" />
            )}
            {(batch.status === 'error' || (batch.status === 'done' && failedCount > 0)) && (
              <AlertCircle size={18} className="text-red-400 shrink-0" />
            )}
            {inProgress && <Loader2 size={18} className="text-gold shrink-0 animate-spin" />}
            <h2 className="text-text-primary text-base font-semibold truncate">
              {batch.status === 'zipping'
                ? 'Building ZIP…'
                : batch.status === 'downloading'
                  ? 'Downloading tracks'
                  : batch.status === 'done'
                    ? 'Download ready'
                    : batch.status === 'cancelled'
                      ? 'Download cancelled'
                      : 'Download failed'}
            </h2>
          </div>
          <p className="text-text-secondary text-xs mb-4 truncate">{batch.label}</p>

          {/* Progress bar */}
          {(inProgress || batch.status === 'done') && (
            <div className="mb-3">
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-[width] duration-200 ease-out"
                  style={{ width: `${batch.status === 'done' ? 100 : pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-text-secondary">
                <span className="truncate pr-2">
                  {batch.status === 'zipping'
                    ? 'Packaging files…'
                    : batch.status === 'done'
                      ? `${batch.total - failedCount} of ${batch.total} saved`
                      : batch.currentName || 'Starting…'}
                </span>
                <span className="shrink-0 tabular-nums">
                  {batch.done}/{batch.total}
                </span>
              </div>
            </div>
          )}

          {failedCount > 0 && (
            <div className="mb-1">
              <p className="text-red-400 text-xs mb-1.5">
                {batch.status === 'error'
                  ? 'No tracks could be downloaded:'
                  : `${failedCount} track${failedCount > 1 ? 's' : ''} could not be downloaded:`}
              </p>
              <ul className="max-h-28 overflow-y-auto rounded-lg bg-red-400/10 border border-red-400/20 divide-y divide-red-400/10">
                {batch.failedNames.map((name, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-text-primary"
                  >
                    <AlertCircle size={11} className="text-red-400 shrink-0" />
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {batch.status === 'error' && failedCount === 0 && (
            <p className="text-text-secondary text-xs mb-1">
              No tracks could be downloaded. Please try again.
            </p>
          )}
          {batch.status === 'cancelled' && (
            <p className="text-text-secondary text-xs mb-1">Cancelled before finishing.</p>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 flex justify-end gap-2">
          {inProgress ? (
            <button
              onClick={cancelBatch}
              className="px-5 py-2 rounded-full bg-white/10 text-text-secondary text-sm font-medium hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={dismissBatch}
              className="px-5 py-2 rounded-full bg-gold text-surface text-sm font-medium hover:bg-gold/85 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SingleToast() {
  const single = useDownloadStore((s) => s.single);
  const dismissSingle = useDownloadStore((s) => s.dismissSingle);

  if (!single) return null;

  return (
    <div className="fixed right-4 bottom-28 md:bottom-24 z-55 animate-in">
      <div className="flex items-center gap-2.5 bg-card border border-border rounded-full shadow-2xl pl-3.5 pr-2 py-2 max-w-[80vw]">
        {single.status === 'downloading' && (
          <Loader2 size={15} className="text-gold shrink-0 animate-spin" />
        )}
        {single.status === 'done' && <Check size={15} className="text-gold shrink-0" />}
        {single.status === 'error' && <AlertCircle size={15} className="text-red-400 shrink-0" />}
        <span className="text-text-primary text-xs truncate">
          {single.status === 'downloading' && (
            <>
              <Download size={11} className="inline mr-1 -mt-0.5 text-text-secondary" />
              Downloading <span className="text-text-secondary">{single.name}</span>
            </>
          )}
          {single.status === 'done' && (
            <>
              Saved <span className="text-text-secondary">{single.name}</span>
            </>
          )}
          {single.status === 'error' && (
            <>
              Couldn’t download <span className="text-text-secondary">{single.name}</span>
            </>
          )}
        </span>
        <button
          onClick={dismissSingle}
          className="text-text-muted hover:text-text-primary transition-colors p-1 shrink-0"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
