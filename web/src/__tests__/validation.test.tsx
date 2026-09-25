import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from '../components/SearchForm';
import { UpdatePartForm, validate } from '../components/UpdatePartForm';
import { bearingDetail } from './fixtures';

describe('client side input validation', () => {
  it('blocks a search that is too short and explains why', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();
    render(<SearchForm onSearch={onSearch} isSearching={false} />);

    await user.type(screen.getByLabelText(/search by part number/i), 'a');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter at least 2 characters to search');
  });

  it.each([
    [{ inventoryLevel: '-1' }, 'Inventory level cannot be negative'],
    [{ inventoryLevel: '2.5' }, 'Inventory level must be a whole number'],
    [{ warehouseLocation: 'WH1 A 12' }, 'Warehouse location may only contain letters, numbers and hyphens'],
    [
      { lifecycleStatus: 'obsolete' as const, reorderPoint: '10' },
      'Obsolete parts must have a reorder point of 0'
    ]
  ])('rejects %p before calling the API', (overrides, expectedMessage) => {
    const errors = validate({
      inventoryLevel: '10',
      reorderPoint: '5',
      warehouseLocation: 'WH1-A-12-3',
      lifecycleStatus: 'active',
      ...overrides
    });

    expect(Object.values(errors)).toContain(expectedMessage);
  });

  it('does not submit the update form while a field is invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <UpdatePartForm
        part={bearingDetail}
        isSaving={false}
        serverErrors={[]}
        onCancel={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    const inventoryField = screen.getByLabelText('Inventory level');
    await user.clear(inventoryField);
    await user.type(inventoryField, '-4');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Inventory level cannot be negative')).toBeInTheDocument();
  });

  it('submits trimmed, typed values when the form is valid', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <UpdatePartForm
        part={bearingDetail}
        isSaving={false}
        serverErrors={[]}
        onCancel={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    const reorderField = screen.getByLabelText('Reorder point');
    await user.clear(reorderField);
    await user.type(reorderField, '80');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      inventoryLevel: 184,
      reorderPoint: 80,
      warehouseLocation: 'WH1-A-12-3',
      lifecycleStatus: 'active'
    });
  });
});
