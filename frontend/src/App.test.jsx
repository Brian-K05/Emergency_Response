import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock AuthContext so we don't need real Supabase
jest.mock('./context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock supabase to avoid network/init errors in tests
jest.mock('./lib/supabase', () => {
  const mockSingle = () => Promise.resolve({ data: null, error: null });
  const mockOrder = () => Promise.resolve({ data: [], error: null });
  const mockEq = () => ({ single: mockSingle, order: mockOrder });
  const mockSelect = () => ({ eq: mockEq });
  return {
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({ select: mockSelect }),
    },
    getCurrentUser: () => Promise.resolve(null),
  };
});

function renderWithRouter(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
}

describe('App', () => {
  it('renders without crashing', () => {
    renderWithRouter('/');
  });

  it('shows landing at root', () => {
    renderWithRouter('/');
    expect(screen.getAllByText(/Emergency Response/i).length).toBeGreaterThan(0);
  });

  it('shows Get started or Create account on landing', () => {
    renderWithRouter('/');
    const createLinks = screen.getAllByRole('link', { name: /create account/i });
    expect(createLinks.length).toBeGreaterThan(0);
  });

  it('shows Login page at /login', () => {
    renderWithRouter('/login');
    expect(screen.getByRole('heading', { name: /sign in|log in|login/i })).toBeInTheDocument();
  });

  it('shows Register page at /register', () => {
    renderWithRouter('/register');
    expect(screen.getByText(/register|create account/i)).toBeInTheDocument();
  });
});
