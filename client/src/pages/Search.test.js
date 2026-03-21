import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Search from './Search';
import { useSearch } from '../context/search';
import { useCart } from '../context/cart';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Mocking hooks and components
jest.mock('../context/search', () => ({
  useSearch: jest.fn(),
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('react-hot-toast');

// Mock SearchInput to avoid its axios import
jest.mock('../components/Form/SearchInput', () => () => <div data-testid="search-input" />);

// Mocking necessary contexts for Layout (Header/Footer)
jest.mock('../context/auth', () => ({
  useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

jest.mock('../hooks/useCategory', () => () => []);

describe('Search Component', () => {
    const mockNavigate = jest.fn();
    const mockSetCart = jest.fn();
    const mockCart = [];

    beforeEach(() => {
        jest.clearAllMocks();
        useNavigate.mockReturnValue(mockNavigate);
        useCart.mockReturnValue([mockCart, mockSetCart]);
    });

    it('renders "No Products Found" when results are empty', () => {
        useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

        const { getByText } = render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        expect(getByText('No Products Found')).toBeInTheDocument();
        expect(getByText('Search Results')).toBeInTheDocument();
    });

    it('navigates to product details when "More Details" is clicked', () => {
        const mockResults = [
            {
                _id: '1',
                name: 'Laptop',
                slug: 'laptop-slug',
                description: 'Powerful laptop',
                price: 1200
            }
        ];
        useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

        const { getByText } = render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        fireEvent.click(getByText('More Details'));
        expect(mockNavigate).toHaveBeenCalledWith('/product/laptop-slug');
    });

    it('adds item to cart and shows toast when "ADD TO CART" is clicked', () => {
        const mockProduct = {
            _id: '1',
            name: 'Laptop',
            slug: 'laptop-slug',
            description: 'Powerful laptop',
            price: 1200
        };
        useSearch.mockReturnValue([{ results: [mockProduct] }, jest.fn()]);
        
        const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem');

        const { getByText } = render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        fireEvent.click(getByText('ADD TO CART'));
        
        expect(mockSetCart).toHaveBeenCalledWith([mockProduct]);
        expect(localStorageSpy).toHaveBeenCalledWith('cart', JSON.stringify([mockProduct]));
        expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
        
        localStorageSpy.mockRestore();
    });
});
