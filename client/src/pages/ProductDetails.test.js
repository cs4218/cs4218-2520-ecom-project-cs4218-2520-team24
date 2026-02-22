import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import ProductDetails from './ProductDetails';
import axios from 'axios';
import toast from 'react-hot-toast';

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
jest.mock('../context/auth', () => ({
  useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

const mockSetCart = jest.fn();

jest.mock('../context/cart', () => ({
  useCart: () => [[], mockSetCart],
}));

jest.mock('../context/search', () => ({
  useSearch: () => [{ keyword: '' }, jest.fn()],
}));

jest.mock('./../components/Layout', () => ({ children }) => <div>{children}</div>);

jest.mock('../hooks/useCategory', () => () => []);


const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ProductDetails Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    const mockProduct = {
        _id: '1',
        name: 'Hammer',
        slug: 'hammer',
        description: 'Hard hammer',
        price: 20,
        category: { _id: 'cat1', name: 'Tools' }
    };

    const mockRelated = [
        {
            _id: '2',
            name: 'Drill',
            slug: 'drill',
            description: 'Fast drill',
            price: 50,
            category: { _id: 'cat1', name: 'Tools' }
        }
    ];

    it('renders product details and similar products', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/get-product/hammer')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/api/v1/product/related-product/1/cat1')) {
                return Promise.resolve({ data: { products: mockRelated } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter initialEntries={['/product/hammer']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Name : Hammer')).toBeInTheDocument());
        expect(getByText('Description : Hard hammer')).toBeInTheDocument();
        expect(getByText('Price :$20.00')).toBeInTheDocument();
        expect(getByText('Category : Tools')).toBeInTheDocument();
        await waitFor(() => {
            const relatedProduct = getByText('Drill');
            expect(relatedProduct).toBeInTheDocument();
        });
    });

    it('renders "No Similar Products found" when related products list is empty', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/get-product/hammer')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/api/v1/product/related-product/1/cat1')) {
                return Promise.resolve({ data: { products: [] } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter initialEntries={['/product/hammer']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );
        await waitFor(() => expect(getByText('Name : Hammer')).toBeInTheDocument());
        await waitFor(() => expect(getByText('No Similar Products found')).toBeInTheDocument());
    });

    it('does not call getProduct when params.slug is missing', async () => {
        render(
            <MemoryRouter initialEntries={['/product/']}>
                <Routes>
                    {/* Route without the :slug parameter or with an empty one */}
                    <Route path="/product/" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // We wait a bit to ensure useEffect has run
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    it('handles cases where API response data is undefined (optional chaining)', async () => {
        // Mocking a successful response but with no data body
        axios.get.mockResolvedValueOnce({ data: null });

        render(
            <MemoryRouter initialEntries={['/product/hammer']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
        // The code should not crash because of the ?. operator
    });
    

    it('logs an error when getProduct API fails', async () => {
        // Force the first API call to fail
        axios.get.mockRejectedValueOnce(new Error('Network Error: getProduct'));

        render(
            <MemoryRouter initialEntries={['/product/hammer']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });
        
        // Verify the error message specifically
        expect(consoleSpy.mock.calls[0][0].message).toBe('Network Error: getProduct');
    });

    it('logs an error when getSimilarProduct API fails', async () => {
        const mockProduct = {
            _id: '1',
            name: 'Hammer',
            slug: 'hammer',
            category: { _id: 'cat1' }
        };

        // Mock first call success, second call failure
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/api/v1/product/related-product/')) {
                return Promise.reject(new Error('Network Error: getSimilarProduct'));
            }
            return Promise.reject(new Error('Not Found'));
        });

        render(
            <MemoryRouter initialEntries={['/product/hammer']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for the first call to finish and the error to be logged from the second call
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        const errorLogged = consoleSpy.mock.calls.find(call => 
            call[0].message === 'Network Error: getSimilarProduct'
        );
        expect(errorLogged).toBeDefined();
    });

    it('navigates to product details page when "More Details" button is clicked', async () => {
        // 1. Setup mock data for the initial load
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/get-product/hammer')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/api/v1/product/related-product/')) {
                return Promise.resolve({ data: { products: mockRelated } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter initialEntries={['/product/hammer']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // 2. Wait for the related product "Drill" to appear
        await waitFor(() => expect(getByText('Drill')).toBeInTheDocument());

        // 3. Find the "More Details" button specifically for the "Drill" product
        // Note: If you have multiple buttons, you might need to use getAllByText or a more specific selector
        const moreDetailsBtn = getByText('More Details');
        
        // 4. Fire the click event
        fireEvent.click(moreDetailsBtn);

        // 5. Assert that navigate was called with the correct slug from mockRelated
        expect(mockNavigate).toHaveBeenCalledWith('/product/drill');
    });

    it('adds product to cart and updates local storage', async () => {
        const storageSpy = jest.spyOn(Storage.prototype, 'setItem');
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes('/api/v1/product/related-product/')) {
                return Promise.resolve({ data: { products: [] } }); // Return empty array, not undefined
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter initialEntries={['/product/hammer']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Name : Hammer')).toBeInTheDocument());
        
        fireEvent.click(getByText('ADD TO CART'));

        // Verify context update
        expect(mockSetCart).toHaveBeenCalled();
        // Verify local storage update
        expect(storageSpy).toHaveBeenCalledWith('cart', expect.stringContaining('hammer'));
        
        storageSpy.mockRestore();
    });
});
