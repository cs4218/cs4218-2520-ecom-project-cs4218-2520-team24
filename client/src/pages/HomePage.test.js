// Nam Dohyun, A0226590A
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import HomePage from './HomePage';
import axios from 'axios';
import toast from 'react-hot-toast';

// Shared mocks
const mockNavigate = jest.fn();
const mockSetCart = jest.fn();

// Mocking axios to avoid ESM issues in Jest
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn().mockReturnThis(),
  defaults: {
    headers: {
      common: {}
    }
  }
}));

// Mocking necessary contexts and hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../context/auth', () => ({
  useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

jest.mock('../context/cart', () => ({
  useCart: () => [[], mockSetCart],
}));

jest.mock('../context/search', () => ({
  useSearch: () => [{ keyword: '' }, jest.fn()],
}));

jest.mock('../hooks/useCategory', () => () => []);

jest.mock('react-hot-toast');

// Mocking react-icons
jest.mock('react-icons/ai', () => ({
  AiOutlineReload: () => <div data-testid="AiOutlineReload" />,
}));

// Mocking antd components because they can be complex to test directly
jest.mock('antd', () => {
  const React = require('react');
  return {
    Checkbox: ({ children, onChange }) => (
      <label>
        <input type="checkbox" onChange={(e) => onChange(e)} />
        {children}
      </label>
    ),
    Radio: Object.assign(
        ({ children, value, onChange }) => (
          <label>
            <input type="radio" value={value} onChange={onChange} />
            {children}
          </label>
        ),
        {
          Group: ({ children, onChange }) => (
            <div role="radiogroup" onChange={(e) => onChange(e)}>{children}</div>
          ),
        }
      ),
    Badge: ({ children, count }) => (
      <div data-testid="antd-badge">
        {children}
        <span className="ant-badge-count">{count}</span>
      </div>
    ),
  };
});

// Mock SearchInput
jest.mock('../components/Form/SearchInput', () => () => <div data-testid="search-input" />);

describe('HomePage Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Spy on console.log to verify catch blocks are executed
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console.log
        console.log.mockRestore();
    });

    const mockProducts = [
        {
            _id: '1',
            name: 'Test Product 1',
            slug: 'test-product-1',
            price: 100,
            description: 'This is a test product description for testing purposes.',
        }
    ];

    const mockCategories = [
        { _id: '1', name: 'Electronics', slug: 'electronics' },
    ];

    it('renders HomePage and initial products', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 1 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText, getByAltText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Test Product 1')).toBeInTheDocument());
        expect(getByText('$100.00')).toBeInTheDocument();
        expect(getByAltText('bannerimage')).toBeInTheDocument();
    });

    it('should handle "RESET FILTERS" by reloading the page', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 1 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        // Mock window.location.reload
        const originalLocation = window.location;
        delete window.location;
        window.location = { reload: jest.fn() };

        await waitFor(() => expect(getByText('Test Product 1')).toBeInTheDocument());

        fireEvent.click(getByText('RESET FILTERS'));
        expect(window.location.reload).toHaveBeenCalled();

        window.location = originalLocation;
    });
    
    it('should handle error when fetching categories fails', async () => {
        // Mock category API to fail, but let others succeed to avoid hung states
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.reject(new Error('Category API Error'));
            }
            return Promise.resolve({ data: { success: true, total: 0, products: [] } });
        });

        render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(console.log).toHaveBeenCalledWith(expect.any(Error));
        });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/v1/product/product-list/1'));
        });
    });

    it('handles the case where category API returns success: false', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                // Branch: data?.success is false
                return Promise.resolve({ data: { success: false } });
            }
            return Promise.resolve({ data: { success: true, total: 0, products: [] } });
        });

        const { queryByText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        // We wait for the last call (product-list) to ensure the component 
        // has finished its lifecycle updates before the test ends.
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('product-list'));
        });

        expect(queryByText('Electronics')).not.toBeInTheDocument();
    });

    it('should handle error when fetching product count fails', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.reject(new Error('Count API Error'));
            }
            return Promise.resolve({ data: { success: true, category: [], products: [] } });
        });

        render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(console.log).toHaveBeenCalledWith(expect.any(Error));
        });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/v1/product/product-list/1'));
        });
    });

    it('should filter products by category', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 1 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            return Promise.reject(new Error('not found'));
        });

        axios.post.mockResolvedValue({ data: { products: [mockProducts[0]] } });

        const { getByLabelText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByLabelText('Electronics')).toBeInTheDocument());
        
        fireEvent.click(getByLabelText('Electronics'));
        
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/v1/product/product-filters', {
                checked: ['1'],
                radio: [],
                page: 1
            });
        });

        // Uncheck
        fireEvent.click(getByLabelText('Electronics'));
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-list/1');
        });
    });

    it('should filter products by price', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 1 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            return Promise.reject(new Error('not found'));
        });

        axios.post.mockResolvedValue({ data: { products: [mockProducts[0]] } });

        const { getByLabelText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByLabelText('$0 to 19')).toBeInTheDocument());
        
        fireEvent.click(getByLabelText('$0 to 19'));
        
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
            expect(axios.post).toHaveBeenCalledWith('/api/v1/product/product-filters', expect.objectContaining({
                checked: [],
                radio: "0,19"
            }));
        });
    });

    it('should append products when loading more filtered results (page > 1)', async () => {
        const filteredPage1 = [
            { _id: 'f1', name: 'Filtered 1', slug: 'f1', price: 10, description: 'desc' }
        ];
        const filteredPage2 = [
            { _id: 'f2', name: 'Filtered 2', slug: 'f2', price: 20, description: 'desc' }
        ];

        // Initial mocks for layout
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: { success: true, total: 10, products: [] } });
        });

        // Mock POST for filtered results (different returns based on page)
        axios.post.mockImplementation((url, body) => {
            if (body.page === 1) {
                return Promise.resolve({ data: { success: true, products: filteredPage1, total: 10 } });
            }
            if (body.page === 2) {
                return Promise.resolve({ data: { success: true, products: filteredPage2, total: 10 } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText, getByLabelText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        // 1. Trigger the initial filter (Page 1)
        await waitFor(() => expect(getByLabelText('$0 to 19')).toBeInTheDocument());
        fireEvent.click(getByLabelText('$0 to 19'));

        // Verify Page 1 products are there
        await waitFor(() => expect(getByText('Filtered 1')).toBeInTheDocument());

        // 2. Trigger "Loadmore" (this sets page to 2)
        const loadMoreBtn = await waitFor(() => getByText(/Load More/i));
        fireEvent.click(loadMoreBtn);

        // 3. ASSERTION: Check that BOTH products exist (Append Logic)
        await waitFor(() => {
            expect(getByText('Filtered 1')).toBeInTheDocument();
            expect(getByText('Filtered 2')).toBeInTheDocument();
        });

        // Verify the API was called with page 2
        expect(axios.post).toHaveBeenCalledWith('/api/v1/product/product-filters', expect.objectContaining({
            page: 2,
            radio: "0,19"
        }));
    });

    it('should load more products', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 2 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: [mockProducts[0]] } });
            }
            if (url.includes('/api/v1/product/product-list/2')) {
                return Promise.resolve({ data: { products: [{ _id: '2', name: 'Test Product 2', slug: 'test-product-2', price: 200, description: 'Desc 2' }] } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Load More')).toBeInTheDocument());
        
        fireEvent.click(getByText('Load More'));
        
        await waitFor(() => {
            expect(getByText('Test Product 2')).toBeInTheDocument();
        });
    });

    it('should handle load more error', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 2 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: [mockProducts[0]] } });
            }
            if (url.includes('/api/v1/product/product-list/2')) {
                return Promise.reject(new Error('Load More Error'));
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Load More')).toBeInTheDocument());
        
        fireEvent.click(getByText('Load More'));
        
        await waitFor(() => {
            expect(console.log).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    it('should navigate to product details', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 1 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('More Details')).toBeInTheDocument());
        fireEvent.click(getByText('More Details'));
        expect(mockNavigate).toHaveBeenCalledWith('/product/test-product-1');
    });

    it('should add product to cart', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 1 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            return Promise.reject(new Error('not found'));
        });

        const { getByText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('ADD TO CART')).toBeInTheDocument());
        fireEvent.click(getByText('ADD TO CART'));

        expect(mockSetCart).toHaveBeenCalled();
        expect(localStorage.getItem('cart')).toContain('test-product-1');
        expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
    });

    it('should handle getAllProducts error', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.reject(new Error('Products API Error'));
            }
            return Promise.resolve({ data: { success: true, total: 0, category: [], products: [] } });
        });

        render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(console.log).toHaveBeenCalledWith(expect.any(Error));
        });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledTimes(3); // category, count, and list
        });
    });

    it('covers useEffect branch: calls getAllProducts when filters are empty', async () => {
        axios.get.mockResolvedValue({ data: { products: [], success: true, total: 0 } });

        render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        // Branch 1: !checked.length is true (initial state is [])
        // This triggers the useEffect and calls getAllProducts
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/v1/product/product-list/1'));
        });
    });

    it('covers useEffect branch: does NOT call getAllProducts when either one of the filters are active', async () => {
        // Mocking the data so the component renders checkboxes and radio buttons
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            return Promise.resolve({ data: { success: true, total: 0, products: [] } });
        });
        axios.post.mockResolvedValue({ data: { products: [] } });

        const { getByLabelText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        // 1. Wait for categories to load
        await waitFor(() => expect(getByLabelText('Electronics')).toBeInTheDocument());

        // Reset the mock counter to ignore the initial load calls
        axios.get.mockClear();

        // 2. Select a Category (updates 'checked' state)
        fireEvent.click(getByLabelText('Electronics'));

        // 3. Select a Price Range (updates 'radio' state)
        // Now both checked.length and radio.length are > 0
        fireEvent.click(getByLabelText('$0 to 19'));


        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
        });

        const getProductCalls = axios.get.mock.calls.filter(call => 
            call[0].includes('/api/v1/product/product-list')
        );
        
        expect(getProductCalls.length).toBe(0);

        await new Promise((r) => setTimeout(r, 0));
    });

    it('should handle filterProduct error', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/category/get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('/api/v1/product/product-count')) {
                return Promise.resolve({ data: { success: true, total: 1 } });
            }
            if (url.includes('/api/v1/product/product-list/1')) {
                return Promise.resolve({ data: { products: mockProducts } });
            }
            return Promise.reject(new Error('not found'));
        });

        axios.post.mockRejectedValue(new Error('Filter API Error'));

        const { getByLabelText } = render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByLabelText('Electronics')).toBeInTheDocument());
        fireEvent.click(getByLabelText('Electronics'));

        await waitFor(() => {
            expect(console.log).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
