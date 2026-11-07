import { useRef, useState } from 'react';
import type { AppData } from '../types';
import type { Updater } from '../store';
import { today } from '../store';
import { TAX_PRESETS, presetFor } from '../tax';
import { clearFiles, defaultData, exportBackup, importBackup } from '../storage';

export function SettingsView(props: { data: AppData; update: Updater; replaceData: (d: AppData) => void }) {
  const { settings } = props.data;
  const p = presetFor(settings.province);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const setRate = (key: 'gstRate' | 'pstRate', value: string) => {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && n <= 100) props.update((d) => void (d.settings[key] = n));
  };

  const doExport = async () => {
    setMessage('Preparing backup…');
    const blob = await exportBackup(props.data);
    const name = `renovation-backup-${today()}.json`;
    const size = `${(blob.size / 1024 / 1024).toFixed(1)} MB`;
    // On iPad, downloads from a home-screen app are unreliable, so use the share sheet
    // (Save to Files, AirDrop, Mail...). Desktop browsers fall back to a normal download.
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        setMessage(`Backup shared (${size}).`);
      } catch (e) {
        setMessage((e as Error).name === 'AbortError' ? 'Backup cancelled.' : `Backup failed: ${(e as Error).message}`);
      }
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Backup downloaded (${size}).`);
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm('Importing replaces ALL current rooms, tasks, quotes and files with the backup. Continue?')) return;
    try {
      props.replaceData(await importBackup(file));
      setMessage(`Imported ${file.name}.`);
    } catch (e) {
      setMessage(`Import failed: ${(e as Error).message}`);
    }
  };

  const reset = async () => {
    if (!confirm('Delete ALL data, including photos and PDFs? Export a backup first if you might need it.')) return;
    await clearFiles();
    props.replaceData(defaultData());
    setMessage('All data deleted.');
  };

  return (
    <div className="page">
      <section className="card">
        <h2>Sales tax</h2>
        <p className="muted small">Enter all amounts before tax. The app adds tax using these rates.</p>
        <div className="grid">
          <label className="field">
            <span>Province / territory</span>
            <select
              value={settings.province}
              onChange={(e) => {
                const preset = presetFor(e.target.value);
                props.update((d) => {
                  d.settings = { province: preset.code, gstRate: preset.gst, pstRate: preset.pst };
                });
              }}
            >
              {TAX_PRESETS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{p.gstLabel} rate (%)</span>
            <input type="number" step="0.001" min={0} max={100} value={settings.gstRate} onChange={(e) => setRate('gstRate', e.target.value)} />
          </label>
          <label className="field">
            <span>{p.pstLabel} rate (%)</span>
            <input type="number" step="0.001" min={0} max={100} value={settings.pstRate} onChange={(e) => setRate('pstRate', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted small">
          Your data is stored only on this device, inside this app. Deleting the app (or clearing its website data) loses it, so
          export a backup regularly. The backup file includes your photos and PDFs. To move data between your Mac and iPad, export
          on one, AirDrop the file, and import it on the other.
        </p>
        <div className="row">
          <button onClick={doExport}>Export backup</button>
          <button onClick={() => fileInput.current?.click()}>Import backup…</button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              doImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p>{message}</p>}
      </section>

      <section className="card">
        <h2>Danger zone</h2>
        <button className="danger" onClick={reset}>
          Delete all data
        </button>
      </section>
    </div>
  );
}
