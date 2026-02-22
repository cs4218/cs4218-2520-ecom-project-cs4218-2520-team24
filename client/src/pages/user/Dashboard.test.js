import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Dashboard from './Dashboard';
import { useAuth } from '../../context/auth';

// Mocking axios to avoid ESM issues in Jest
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    headers: {
      common: {}
    }
  }
}));

// Mocking necessary contexts and hooks
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../context/cart', () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock('../../context/search', () => ({
  useSearch: () => [{ keyword: '' }, jest.fn()],
}));

jest.mock('../../hooks/useCategory', () => () => []);

// Mock UserMenu to avoid its dependencies
jest.mock('../../components/UserMenu', () => () => <div data-testid="user-menu" />);

describe('User Dashboard Page', () => {
    it('renders user information from auth context', () => {
        const mockAuth = {
            user: {
                name: 'John User',
                email: 'john@example.com',
                address: '456 User Lane'
            },
            token: 'fake-token'
        };
        useAuth.mockReturnValue([mockAuth]);

        const { getByText, getAllByText, getByTestId } = render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(getByTestId('user-menu')).toBeInTheDocument();
        expect(getAllByText('John User').length).toBeGreaterThan(0);
        expect(getByText('john@example.com')).toBeInTheDocument();
        expect(getByText('456 User Lane')).toBeInTheDocument();
    });
});
