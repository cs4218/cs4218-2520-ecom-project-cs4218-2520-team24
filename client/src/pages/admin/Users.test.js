import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Users from './Users';

// Mocking necessary contexts
jest.mock('../../context/auth', () => ({
  useAuth: () => [{ token: 'admin-token' }, jest.fn()],
}));

jest.mock('../../context/cart', () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock('../../context/search', () => ({
  useSearch: () => [{ keyword: '' }, jest.fn()],
}));

jest.mock('../../hooks/useCategory', () => () => []);

// Mock AdminMenu
jest.mock('../../components/AdminMenu', () => () => <div data-testid="admin-menu" />);

// Mock SearchInput
jest.mock('../../components/Form/SearchInput', () => () => <div data-testid="search-input" />);

// Mock antd
jest.mock('antd', () => ({
    Badge: ({ children, count }) => (
        <div data-testid="antd-badge">
            {children}
            <span>{count}</span>
        </div>
    ),
}));

describe('Admin Users Page', () => {
    it('renders All Users header', () => {
        const { getByText } = render(
            <MemoryRouter>
                <Users />
            </MemoryRouter>
        );

        expect(getByText('All Users')).toBeInTheDocument();
    });
});
