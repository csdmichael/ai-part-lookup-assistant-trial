import { useCallback, useState } from 'react';
import { ApiError, fetchPart, searchParts, updatePart } from './api/client';
import { FeedbackBanner } from './components/FeedbackBanner';
import { PartDetails } from './components/PartDetails';
import { SearchForm } from './components/SearchForm';
import { SearchResults } from './components/SearchResults';
import { UpdatePartForm } from './components/UpdatePartForm';
import type { FieldError, PartDetail, PartSummary, PartUpdate } from './types';

type Feedback = { tone: 'success' | 'error' | 'info'; message: string; details?: string[] } | null;

export function App() {
  const [results, setResults] = useState<PartSummary[] | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPart, setIsLoadingPart] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const reportError = useCallback((error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      setServerErrors(error.fieldErrors);
      setFeedback({
        tone: 'error',
        message: error.message,
        details: error.fieldErrors.map((detail) => detail.message)
      });
      return;
    }
    setFeedback({ tone: 'error', message: fallback });
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      setIsSearching(true);
      setFeedback(null);
      setServerErrors([]);
      try {
        const response = await searchParts(query);
        setResults(response.results);
        setSelectedPart(null);
        setIsEditing(false);
        setFeedback(
          response.count === 0
            ? { tone: 'info', message: `No parts match "${response.query}". Try a different part number or name.` }
            : { tone: 'success', message: `${response.count} part(s) found for "${response.query}".` }
        );
      } catch (error) {
        setResults([]);
        reportError(error, 'The search could not be completed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    },
    [reportError]
  );

  const handleSelect = useCallback(
    async (partNumber: string) => {
      setIsLoadingPart(true);
      setIsEditing(false);
      setServerErrors([]);
      try {
        setSelectedPart(await fetchPart(partNumber));
        setFeedback(null);
      } catch (error) {
        setSelectedPart(null);
        reportError(error, 'The part details could not be loaded. Please try again.');
      } finally {
        setIsLoadingPart(false);
      }
    },
    [reportError]
  );

  const handleUpdate = useCallback(
    async (changes: Partial<PartUpdate>) => {
      if (!selectedPart) {
        return;
      }
      setIsSaving(true);
      setServerErrors([]);
      try {
        const response = await updatePart(selectedPart.partNumber, changes);
        setSelectedPart(response.part);
        setIsEditing(false);
        setResults((current) =>
          current?.map((part) =>
            part.partNumber === response.part.partNumber
              ? {
                  ...part,
                  inventoryLevel: response.part.inventoryLevel,
                  reorderPoint: response.part.reorderPoint,
                  lifecycleStatus: response.part.lifecycleStatus
                }
              : part
          ) ?? current
        );
        setFeedback({ tone: 'success', message: response.message });
      } catch (error) {
        reportError(error, 'The changes could not be saved. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [reportError, selectedPart]
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>AI Part Lookup Assistant</h1>
        <p className="muted">
          Inventory, supplier, purchase order and delivery information for a part, in one place.
        </p>
      </header>

      <main>
        <SearchForm onSearch={handleSearch} isSearching={isSearching} />

        {feedback ? (
          <FeedbackBanner
            tone={feedback.tone}
            message={feedback.message}
            details={feedback.details}
            onDismiss={() => setFeedback(null)}
          />
        ) : null}

        <div className="layout">
          <section className="panel" aria-labelledby="results-heading">
            <h2 id="results-heading">Results</h2>
            {results === null ? (
              <p className="muted">Search for a part to get started.</p>
            ) : results.length === 0 ? (
              <p className="muted">No parts to display.</p>
            ) : (
              <SearchResults
                results={results}
                selectedPartNumber={selectedPart?.partNumber}
                onSelect={handleSelect}
              />
            )}
          </section>

          <div className="detail-column">
            {isLoadingPart ? <p role="status">Loading part details…</p> : null}
            {selectedPart && !isEditing ? (
              <PartDetails part={selectedPart} onEdit={() => setIsEditing(true)} />
            ) : null}
            {selectedPart && isEditing ? (
              <UpdatePartForm
                part={selectedPart}
                isSaving={isSaving}
                serverErrors={serverErrors}
                onCancel={() => {
                  setIsEditing(false);
                  setServerErrors([]);
                }}
                onSubmit={handleUpdate}
              />
            ) : null}
            {!selectedPart && !isLoadingPart ? (
              <section className="panel">
                <h2>Part details</h2>
                <p className="muted">Select a search result to see the unified part record.</p>
              </section>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="app-footer muted">
        Sample data only. Commercially sensitive fields are masked by the API.
      </footer>
    </div>
  );
}
