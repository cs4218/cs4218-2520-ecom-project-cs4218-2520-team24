import React from 'react';
import { render, waitFor, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import CategoryProduct from './CategoryProduct';
import axios from 'axios';

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

jest.mock('../context/cart', () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock('../context/search', () => ({
  useSearch: () => [{ keyword: '' }, jest.fn()],
}));

jest.mock('../hooks/useCategory', () => () => []);

const mockedUsedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedUsedNavigate,
}));

describe('CategoryProduct Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockCategory = { _id: 'cat1', name: 'Electronics' };
    const mockProducts = [
        {
            _id: '1',
            name: 'Laptop',
            slug: 'laptop',
            description: 'Powerful laptop',
            price: 1000,
        }
    ];

    it('renders products for the given category', async () => {
        axios.get.mockResolvedValue({
            data: {
                success: true,
                category: mockCategory,
                products: mockProducts
            }
        });

        const { getByText } = render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Category - Electronics')).toBeInTheDocument());
        expect(getByText('1 result found')).toBeInTheDocument();
        expect(getByText('Laptop')).toBeInTheDocument();
        expect(getByText('$1,000.00')).toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
        axios.get.mockRejectedValue(new Error('API error'));
        console.log = jest.fn();

        render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(console.log).toHaveBeenCalled());
    });


    it ("should navigate to product details page when 'More Details' is clicked", async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                success: true,
                category: { name: "Electronics", slug: "electronics" },
                products: [
                    {
                        _id: "1",
                        name: "Laptop",
                        slug: "laptop", // This slug determines the URL
                        description: "Powerful laptop",
                        price: 1000,
                    },
                ],
            },
        });
        
        render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // 2. Find the button (adjust text if necessary)
        const detailsButton = await screen.findByText(/More Details/i);
        
        // 3. Simulate click
        fireEvent.click(detailsButton);

        // 4. Assert that navigate was called with the slug-based URL
        expect(mockedUsedNavigate).toHaveBeenCalledWith("/product/laptop");
    });

    it('should not fetch products if slug is missing', () => {
        render(
            <MemoryRouter initialEntries={['/category/']}>
                <Routes>
                    {/* Route without the :slug parameter */}
                    <Route path="/category/" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        expect(axios.get).not.toHaveBeenCalled();
    });

    it('handles missing data fields in API response', async () => {
        // Simulate a response where products and category are missing
        axios.get.mockResolvedValueOnce({
            data: {} 
        });

        render(
            <MemoryRouter initialEntries={['/category/electronics']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Should render "0 result found" instead of crashing
        await waitFor(() => {
            expect(screen.getByText(/0 result found/i)).toBeInTheDocument();
        });
    });

    it('calls the API with the correct slug parameter', async () => {
        axios.get.mockResolvedValueOnce({ data: { products: [], category: {} } });

        render(
            <MemoryRouter initialEntries={['/category/special-deal']}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                '/api/v1/product/product-category/special-deal'
            );
        });
    });
});
