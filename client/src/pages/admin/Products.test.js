// Nam Dohyun, A0226590A
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Products from './Products';
import axios from 'axios';
import toast from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast');

// Mocking axios
jest.mock('axios', () => ({
  get: jest.fn(),
  defaults: { headers: { common: {} } }
}));

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

describe('Admin Products Page', () => {
    it('renders all products list', async () => {
        const mockProducts = [
            { _id: '1', name: 'Product 1', description: 'Desc 1', slug: 'p1' },
            { _id: '2', name: 'Product 2', description: 'Desc 2', slug: 'p2' }
        ];
        axios.get.mockResolvedValue({ data: { success: true, products: mockProducts } });

        const { getByText } = render(
            <MemoryRouter>
                <Products />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Product 1')).toBeInTheDocument());
        await waitFor(() => expect(getByText(/Desc 1/i)).toBeInTheDocument());
        expect(getByText('Product 2')).toBeInTheDocument();
        expect(getByText(/Desc 2/i)).toBeInTheDocument();
    });

    it('handles error in getAllProducts', async () => {
        axios.get.mockRejectedValue(new Error('Fetch error'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const { getByText } = render(<MemoryRouter><Products /></MemoryRouter>);
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
