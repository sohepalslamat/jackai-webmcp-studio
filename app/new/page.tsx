'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { store } from '../../lib/store';

/**
 * The create form. The field options mirror the enums in the create_assistant
 * input schema exactly, so a human and an agent can produce the same shapes.
 */

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
    <div className="trace-in">
      <Link href="/" className="stamp transition-colors hover:text-[var(--color-ink)]">
        ← assistants
      </Link>

      <h1
        className="mt-5 text-2xl text-[var(--color-ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        New assistant
      </h1>

      <form onSubmit={submit} className="mt-8 space-y-7">
        <Field label="name" hint="as the customer sees it" htmlFor="name">
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-b border-[var(--color-rule-bright)] bg-transparent pb-2 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
            autoFocus
          />
        </Field>

        <Field label="purpose" hint="what it does, in one sentence" htmlFor="purpose">
          <textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            className="w-full resize-y border-b border-[var(--color-rule-bright)] bg-transparent pb-2 text-base leading-relaxed text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
          />
        </Field>

        <div className="grid gap-7 sm:grid-cols-2">
          <Field label="tone" htmlFor="tone">
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full cursor-pointer border-b border-[var(--color-rule-bright)] bg-transparent pb-2 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
            >
              {TONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="reply language" htmlFor="language">
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full cursor-pointer border-b border-[var(--color-rule-bright)] bg-transparent pb-2 text-base text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-alarm)]"
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
          <p
            role="alert"
            className="border-l-2 border-[var(--color-halt)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-halt)]"
          >
            {error}
          </p>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="bg-[var(--color-ink)] px-6 py-3 text-sm font-bold tracking-wide text-[var(--color-void)] transition-opacity hover:opacity-90"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            CREATE
          </button>
          <Link href="/" className="stamp transition-colors hover:text-[var(--color-ink)]">
            cancel
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
      <label htmlFor={htmlFor} className="stamp block text-[var(--color-ink-dim)]">
        {label}
        {hint && <span className="ms-2 normal-case tracking-normal opacity-60">— {hint}</span>}
      </label>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
