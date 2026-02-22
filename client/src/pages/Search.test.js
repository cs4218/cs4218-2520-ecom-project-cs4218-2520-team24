import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Search from './Search';
import { useSearch } from '../context/search';

// Mocking useSearch hook
jest.mock('../context/search', () => ({
  useSearch: jest.fn(),
}));

// Mock SearchInput to avoid its axios import
jest.mock('../components/Form/SearchInput', () => () => <div data-testid="search-input" />);

// Mocking necessary contexts for Layout (Header/Footer)
jest.mock('../context/auth', () => ({
  useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

jest.mock('../context/cart', () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock('../hooks/useCategory', () => () => []);

describe('Search Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders "No Products Found" when results are empty', () => {
        useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

        const { getByText } = render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        expect(getByText('No Products Found')).toBeInTheDocument();
        expect(getByText('Search Resuts')).toBeInTheDocument(); // Typo in original component "Resuts"
    });

    it('renders found products', () => {
        const mockResults = [
            {
                _id: '1',
                name: 'Laptop',
                description: 'Powerful laptop for gaming',
                price: 1200
            }
        ];
        useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

        const { getByText } = render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        expect(getByText('Found 1')).toBeInTheDocument();
        expect(getByText('Laptop')).toBeInTheDocument();
        expect(getByText('Powerful laptop for gaming...')).toBeInTheDocument();
        expect(getByText('$ 1200')).toBeInTheDocument();
    });
});
