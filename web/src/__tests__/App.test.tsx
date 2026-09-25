import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { bearingDetail, bearingSummary, installFetchFailure, installFetchStub, restoreFetch } from './fixtures';

describe('part lookup workflow', () => {
  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
  });

  it('searches, reviews the unified record and saves an update with confirmation', async () => {
    const user = userEvent.setup();
    let stored = { ...bearingDetail };

    installFetchStub((url, init) => {
      if (url.startsWith('/api/parts?query=')) {
        return { status: 200, body: { query: 'bearing', count: 1, results: [bearingSummary] } };
      }
      if (init?.method === 'PUT') {
        const changes = JSON.parse(String(init.body)) as { inventoryLevel: number };
        stored = { ...stored, inventoryLevel: changes.inventoryLevel };
        return { status: 200, body: { success: true, message: 'Part BRG-22045 was updated', part: stored } };
      }
      return { status: 200, body: stored };
    });

    render(<App />);

    await user.type(screen.getByLabelText(/search by part number/i), 'bearing');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('1 part(s) found for "bearing".')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /BRG-22045/ }));

    expect(await screen.findByRole('heading', { name: /BRG-22045/ })).toBeInTheDocument();
    expect(screen.getByText('Acme Precision Components')).toBeInTheDocument();
    expect(screen.getByText('PO-2026-004182')).toBeInTheDocument();
    expect(screen.getByText('2026-10-06')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update part' }));

    const inventoryField = screen.getByLabelText('Inventory level');
    await user.clear(inventoryField);
    await user.type(inventoryField, '200');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Part BRG-22045 was updated')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('200 EA')).toBeInTheDocument());
  });

  it('shows a clear message when no part matches the search', async () => {
    const user = userEvent.setup();
    installFetchStub(() => ({ status: 200, body: { query: 'zzz', count: 0, results: [] } }));

    render(<App />);
    await user.type(screen.getByLabelText(/search by part number/i), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByText('No parts match "zzz". Try a different part number or name.')
    ).toBeInTheDocument();
  });

  it('surfaces server side validation errors when an update is rejected', async () => {
    const user = userEvent.setup();

    installFetchStub((url, init) => {
      if (url.startsWith('/api/parts?query=')) {
        return { status: 200, body: { query: 'bearing', count: 1, results: [bearingSummary] } };
      }
      if (init?.method === 'PUT') {
        return {
          status: 400,
          body: {
            error: {
              code: 'validation_failed',
              message: 'The changes could not be saved',
              details: [{ field: 'reorderPoint', message: 'Obsolete parts must have a reorder point of 0' }]
            }
          }
        };
      }
      return { status: 200, body: bearingDetail };
    });

    render(<App />);
    await user.type(screen.getByLabelText(/search by part number/i), 'bearing');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: /BRG-22045/ }));
    await user.click(await screen.findByRole('button', { name: 'Update part' }));
    const reorderField = screen.getByLabelText('Reorder point');
    await user.clear(reorderField);
    await user.type(reorderField, '10');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((alert) => alert.textContent?.includes('The changes could not be saved'))).toBe(true);
    expect(
      alerts.some((alert) => alert.textContent?.includes('Obsolete parts must have a reorder point of 0'))
    ).toBe(true);
  });

  it('reports a friendly error when the API cannot be reached', async () => {
    const user = userEvent.setup();
    installFetchFailure();

    render(<App />);
    await user.type(screen.getByLabelText(/search by part number/i), 'bearing');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByText('We could not reach the part service. Check your connection and try again.')
    ).toBeInTheDocument();
  });

  it('never renders commercially sensitive values', async () => {
    const user = userEvent.setup();
    installFetchStub((url) =>
      url.startsWith('/api/parts?query=')
        ? { status: 200, body: { query: 'bearing', count: 1, results: [bearingSummary] } }
        : { status: 200, body: bearingDetail }
    );

    render(<App />);
    await user.type(screen.getByLabelText(/search by part number/i), 'bearing');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: /BRG-22045/ }));
    await screen.findByRole('heading', { name: /BRG-22045/ });

    expect(document.body.textContent).not.toContain('18.42');
    expect(document.body.textContent).toContain('o*****@acme-precision.example.com');
  });
});
