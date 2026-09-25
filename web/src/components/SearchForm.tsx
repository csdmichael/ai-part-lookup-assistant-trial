import type { FormEvent } from 'react';
import { useState } from 'react';

interface SearchFormProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  initialQuery?: string;
}

export function SearchForm({ onSearch, isSearching, initialQuery = '' }: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setError('Enter at least 2 characters to search');
      return;
    }

    setError(null);
    onSearch(trimmed);
  }

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate>
      <label className="field" htmlFor="part-search">
        Search by part number, name, category or supplier
      </label>
      <div className="search-row">
        <input
          id="part-search"
          name="query"
          type="search"
          autoComplete="off"
          value={query}
          placeholder="e.g. BRG-22045 or bearing"
          aria-describedby={error ? 'part-search-error' : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {error ? (
        <p className="field-error" id="part-search-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
