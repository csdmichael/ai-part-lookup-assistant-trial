import { Router } from 'express';
import type { Request } from 'express';
import type { PartService } from '../services/partService';

const ACTOR_HEADER = 'x-user-id';
const ACTOR_PATTERN = /^[A-Za-z0-9._@-]{1,64}$/;

/** Identifies the caller for audit purposes, falling back to an anonymous engineer in Dev. */
export function resolveActor(req: Request): string {
  const header = req.get(ACTOR_HEADER);
  return header && ACTOR_PATTERN.test(header) ? header : 'anonymous-engineer';
}

export function createPartsRouter(service: PartService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(service.search({ query: req.query.query, limit: req.query.limit }));
  });

  router.post('/search', (req, res) => {
    const body = (req.body ?? {}) as { query?: unknown; limit?: unknown };
    res.json(service.search({ query: body.query, limit: body.limit }));
  });

  router.get('/:partNumber', (req, res) => {
    res.json(service.getPart(req.params.partNumber));
  });

  router.put('/:partNumber', (req, res) => {
    const part = service.updatePart(req.params.partNumber, req.body, resolveActor(req));
    res.json({
      success: true,
      message: `Part ${part.partNumber} was updated`,
      part
    });
  });

  return router;
}
