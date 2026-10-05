import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthContext } from './contexts/AuthContext';

jest.mock('./contexts/AuthContext', () => ({
  AuthContext: require('react').createContext({ tier: 'full', loading: false }),
}));
jest.mock('./components/Layout', () => ({ __esModule: true, default: ({ children }) => <div data-testid="shell">{children}</div> }));
jest.mock('./routes/AppRoutes', () => ({ __esModule: true, default: () => <main>Active routes</main> }));
jest.mock('./components/GlobalSnackbar', () => ({ __esModule: true, default: () => null }));

function mount(path, loading = false) {
  return render(<MemoryRouter initialEntries={[path]}><AuthContext.Provider value={{ tier: 'full', loading }}><App /></AuthContext.Provider></MemoryRouter>);
}

test('active product pages use the shared shell', () => {
  mount('/inventory');
  expect(screen.getByTestId('shell')).toContainElement(screen.getByText('Active routes'));
});
test('login renders without the authenticated shell', () => {
  mount('/login');
  expect(screen.getByText('Active routes')).toBeInTheDocument();
  expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
});
test('session loading hides product routes until user data arrives', () => {
  mount('/inventory', true);
  expect(screen.getByText(/Loading user data/)).toBeInTheDocument();
  expect(screen.queryByText('Active routes')).not.toBeInTheDocument();
});
