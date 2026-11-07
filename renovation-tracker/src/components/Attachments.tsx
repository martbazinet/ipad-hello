import { useEffect, useState, type MouseEvent } from 'react';
import type { Attachment } from '../types';
import { deleteFile, getFile, newId, putFile } from '../storage';

const MAX_BYTES = 25 * 1024 * 1024;

/** Photo and PDF list for a room, task or quote. */
export function Attachments(props: { items: Attachment[]; onChange: (items: Attachment[]) => void }) {
  const [error, setError] = useState<string | null>(null);

  const add = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const added: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
        setError(`${f.name}: only photos and PDFs are supported.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setError(`${f.name}: larger than 25 MB.`);
        continue;
      }
      const a: Attachment = { id: newId(), name: f.name, type: f.type, size: f.size, addedAt: new Date().toISOString() };
      try {
        await putFile(a.id, f);
        added.push(a);
      } catch (e) {
        setError(`${f.name}: could not be saved (${(e as Error).message}).`);
      }
    }
    if (added.length) props.onChange([...props.items, ...added]);
  };

  const remove = async (a: Attachment) => {
    if (!confirm(`Delete ${a.name}?`)) return;
    await deleteFile(a.id).catch(() => undefined);
    props.onChange(props.items.filter((x) => x.id !== a.id));
  };

  return (
    <div className="attachments">
      <div className="att-list">
        {props.items.map((a) => (
          <AttachmentItem key={a.id} a={a} onRemove={() => remove(a)} />
        ))}
        <label className="att-add">
          + Photo / PDF
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            hidden
            onChange={(e) => {
              add(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function AttachmentItem({ a, onRemove }: { a: Attachment; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [viewing, setViewing] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    getFile(a.id)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          setBlob(blob);
        } else setMissing(true);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [a.id]);

  const isImage = a.type.startsWith('image/');
  // Open inside the app: a new tab can't open these files from an iPad home-screen app.
  const open = (e: MouseEvent) => {
    e.preventDefault();
    if (url) setViewing(true);
  };
  const file = blob ? new File([blob], a.name, { type: a.type }) : null;
  const canShare = !!file && !!navigator.canShare?.({ files: [file] });
  const share = () => file && navigator.share({ files: [file], title: a.name }).catch(() => undefined);
  return (
    <div className="att-item">
      <a href={url ?? undefined} onClick={open} title={a.name}>
        {isImage && url ? <img src={url} alt={a.name} /> : <div className="att-icon">{isImage ? 'IMG' : 'PDF'}</div>}
        <span className="att-name">{missing ? `${a.name} (file missing)` : a.name}</span>
      </a>
      <button className="link danger" onClick={onRemove} aria-label={`Delete ${a.name}`}>
        ✕
      </button>
      {viewing && url && (
        <div className="viewer-backdrop" onClick={() => setViewing(false)}>
          <div className="viewer" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-bar">
              <strong className="viewer-name">{a.name}</strong>
              {canShare && <button onClick={share}>Share / Open in…</button>}
              <button className="primary" onClick={() => setViewing(false)}>
                Close
              </button>
            </div>
            {isImage ? <img className="viewer-img" src={url} alt={a.name} /> : <iframe className="viewer-pdf" src={url} title={a.name} />}
          </div>
        </div>
      )}
    </div>
  );
}
