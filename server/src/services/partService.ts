import { NotFoundError, ValidationError } from '../domain/errors';
import type { PartDetailView, PartSummaryView } from '../domain/types';
import { partNumberSchema, partUpdateSchema, searchQuerySchema, toFieldErrors } from '../domain/validation';
import type { Logger } from '../observability/logger';
import { logger as defaultLogger } from '../observability/logger';
import type { PartRepository } from '../repositories/partRepository';
import { toPartDetailView, toPartSummaryView } from '../security/masking';

export interface SearchResult {
  query: string;
  count: number;
  results: PartSummaryView[];
}

export class PartService {
  constructor(
    private readonly repository: PartRepository,
    private readonly logger: Logger = defaultLogger,
    private readonly now: () => Date = () => new Date()
  ) {}

  search(rawQuery: unknown): SearchResult {
    const parsed = searchQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new ValidationError('The search request is not valid', toFieldErrors(parsed.error));
    }

    const { query, limit } = parsed.data;
    const matches = this.repository.search(query, limit);
    this.logger.info('part.search', { query, resultCount: matches.length });

    return {
      query,
      count: matches.length,
      results: matches.map(toPartSummaryView)
    };
  }

  getPart(rawPartNumber: unknown): PartDetailView {
    const parsed = partNumberSchema.safeParse(rawPartNumber);
    if (!parsed.success) {
      throw new ValidationError('The part number is not valid', toFieldErrors(parsed.error));
    }

    const part = this.repository.findByPartNumber(parsed.data);
    if (!part) {
      throw new NotFoundError(`No part found for "${parsed.data}"`);
    }

    return toPartDetailView(part);
  }

  updatePart(rawPartNumber: unknown, rawBody: unknown, actor: string): PartDetailView {
    const parsedPartNumber = partNumberSchema.safeParse(rawPartNumber);
    if (!parsedPartNumber.success) {
      throw new ValidationError('The part number is not valid', toFieldErrors(parsedPartNumber.error));
    }

    const parsedBody = partUpdateSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      throw new ValidationError('The changes could not be saved', toFieldErrors(parsedBody.error));
    }

    const changes = parsedBody.data;
    const existing = this.repository.findByPartNumber(parsedPartNumber.data);
    if (!existing) {
      throw new NotFoundError(`No part found for "${parsedPartNumber.data}"`);
    }

    const reorderPoint = changes.reorderPoint ?? existing.reorderPoint;
    const lifecycleStatus = changes.lifecycleStatus ?? existing.lifecycleStatus;
    if (lifecycleStatus === 'obsolete' && reorderPoint > 0) {
      throw new ValidationError('The changes could not be saved', [
        { field: 'reorderPoint', message: 'Obsolete parts must have a reorder point of 0' }
      ]);
    }

    const timestamp = this.now().toISOString();
    const updated = this.repository.update(parsedPartNumber.data, changes, timestamp);
    if (!updated) {
      throw new NotFoundError(`No part found for "${parsedPartNumber.data}"`);
    }

    const changedFields = Object.keys(changes);
    this.repository.recordAudit({
      entityType: 'part',
      entityId: updated.partNumber,
      action: 'update',
      changedFields,
      actor,
      createdAt: timestamp
    });
    this.logger.info('part.update', { partNumber: updated.partNumber, changedFields, actor });

    return toPartDetailView(updated);
  }
}
