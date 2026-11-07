import { useEffect, useState } from 'react';

/** Number input that lets you type freely and commits a valid number on blur. */
export function MoneyField(props: { label: string; value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(props.value || ''));
  useEffect(() => {
    setText(String(props.value || ''));
  }, [props.value]);

  const commit = () => {
    const n = Number(text.replace(/[$,\s]/g, ''));
    const valid = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
    setText(String(valid || ''));
    if (valid !== props.value) props.onChange(valid);
  };

  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        inputMode="decimal"
        placeholder="0.00"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
}

/** Text input that commits on blur so every keystroke doesn't rewrite storage. */
export function TextField(props: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(props.value);
  useEffect(() => {
    setText(props.value);
  }, [props.value]);
  const commit = () => text !== props.value && props.onChange(text);

  return (
    <label className={`field${props.multiline ? ' wide' : ''}`}>
      <span>{props.label}</span>
      {props.multiline ? (
        <textarea rows={3} value={text} placeholder={props.placeholder} onChange={(e) => setText(e.target.value)} onBlur={commit} />
      ) : (
        <input
          type={props.type ?? 'text'}
          value={text}
          placeholder={props.placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      )}
    </label>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="progress" title={`${percent}%`}>
      <div className="progress-fill" style={{ width: `${percent}%` }} />
      <span>{percent}%</span>
    </div>
  );
}

/** Inline "name + Add" form used for rooms and tasks. */
export function AddForm(props: { placeholder: string; button: string; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <form
      className="add-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          props.onAdd(name.trim());
          setName('');
        }
      }}
    >
      <input value={name} placeholder={props.placeholder} onChange={(e) => setName(e.target.value)} />
      <button type="submit" disabled={!name.trim()}>
        {props.button}
      </button>
    </form>
  );
}
