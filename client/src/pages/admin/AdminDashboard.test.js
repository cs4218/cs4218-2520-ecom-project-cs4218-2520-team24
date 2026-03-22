// Nam Dohyun, A0226590A
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import AdminDashboard from './AdminDashboard';
import { useAuth } from '../../context/auth';

// Mocking axios to avoid ESM issues
jest.mock('axios', () => ({
  get: jest.fn(),
  defaults: { headers: { common: {} } }
}));

// Mocking necessary contexts
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

// Mock AdminMenu
jest.mock('../../components/AdminMenu', () => () => <div data-testid="admin-menu" />);

describe('AdminDashboard Page', () => {
    it('renders admin information from auth context', () => {
        const mockAuth = {
            user: {
                name: 'Admin User',
                email: 'admin@example.com',
                phone: '9876543210'
            }
        };
        useAuth.mockReturnValue([mockAuth]);

        const { getByText, getByTestId } = render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>
        );

        expect(getByTestId('admin-menu')).toBeInTheDocument();
        expect(getByText(/Admin Name : Admin User/i)).toBeInTheDocument();
        expect(getByText(/Admin Email : admin@example.com/i)).toBeInTheDocument();
        expect(getByText(/Admin Contact : 9876543210/i)).toBeInTheDocument();
    });
});
