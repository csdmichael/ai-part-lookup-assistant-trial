import type { PartSummary } from '../types';

interface SearchResultsProps {
  results: PartSummary[];
  selectedPartNumber?: string;
  onSelect: (partNumber: string) => void;
}

function stockState(part: PartSummary): { label: string; tone: string } {
  if (part.inventoryLevel === 0) {
    return { label: 'Out of stock', tone: 'critical' };
  }
  if (part.inventoryLevel < part.reorderPoint) {
    return { label: 'Below reorder point', tone: 'warning' };
  }
  return { label: 'In stock', tone: 'ok' };
}

export function SearchResults({ results, selectedPartNumber, onSelect }: SearchResultsProps) {
  return (
    <ul className="result-list" aria-label="Search results">
      {results.map((part) => {
        const stock = stockState(part);
        return (
          <li key={part.partNumber}>
            <button
              type="button"
              className={`result-card${selectedPartNumber === part.partNumber ? ' result-card-selected' : ''}`}
              onClick={() => onSelect(part.partNumber)}
              aria-current={selectedPartNumber === part.partNumber ? 'true' : undefined}
            >
              <span className="result-title">
                {part.partNumber} · {part.partName}
              </span>
              <span className="result-meta">{part.category}</span>
              <span className="result-meta">Supplier: {part.supplierName}</span>
              <span className="result-meta">
                On hand: {part.inventoryLevel} (reorder at {part.reorderPoint})
              </span>
              <span className="result-meta">
                Next delivery: {part.nextDeliveryDate ?? 'No open purchase orders'}
              </span>
              <span className={`tag tag-${stock.tone}`}>{stock.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
