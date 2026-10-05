import { render, screen, fireEvent } from '@testing-library/react';
import { PageHeader } from './PageHeader';

test('compact headers retain the page heading and actionable controls', () => {
  const save = jest.fn();
  render(<PageHeader title="Inventory" compact icon={<span aria-label="Stock icon" />}
    actions={<button onClick={save}>Add stock</button>} />);
  expect(screen.getByRole('heading', { name: 'Inventory', level: 1 })).toBeInTheDocument();
  expect(screen.getByLabelText('Stock icon')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add stock' }));
  expect(save).toHaveBeenCalledTimes(1);
});
