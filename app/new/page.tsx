'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { store } from '../../lib/store';

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'brief', label: 'Brief' },
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'tr', label: 'Turkish' },
] as const;

/**
 * The create form. The field options mirror the enums in the create_assistant
 * input schema exactly, so a human and an agent can produce the same shapes.
 */
export default function NewAssistantPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [tone, setTone] = useState<string>('friendly');
  const [language, setLanguage] = useState<string>('en');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const id = store.create({ name, purpose, tone, language });
      router.push(`/assistant/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div>
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to list
      </Link>

      <h2 className="mt-4 text-lg font-semibold text-slate-900">New assistant</h2>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <Field label="Name" hint="As the customer sees it" htmlFor="name">
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            autoFocus
          />
        </Field>

        <Field label="Purpose" hint="What it does, in one sentence" htmlFor="purpose">
          <textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tone" htmlFor="tone">
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {TONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Language" htmlFor="language">
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Create
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-900">
        {label}
      </label>
      {hint && <p className="mb-1.5 mt-0.5 text-xs text-slate-500">{hint}</p>}
      {!hint && <div className="h-1.5" />}
      {children}
    </div>
  );
}
