// Nam Dohyun, A0226590A
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import UpdateProduct from './UpdateProduct';
import axios from 'axios';
import toast from 'react-hot-toast';

// Mocking axios
jest.mock('axios', () => ({
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: { headers: { common: {} } }
}));

// Mocking necessary contexts
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'test-product' }),
}));

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

// Mock antd Select and Badge
jest.mock('antd', () => {
    const React = require('react');
    return {
        Select: Object.assign(
            ({ children, onChange, placeholder, value }) => (
                <select aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)}>
                    {children}
                </select>
            ),
            {
                Option: ({ children, value }) => <option value={value}>{children}</option>,
            }
        ),
        Badge: ({ children, count }) => (
            <div data-testid="antd-badge">
                {children}
                <span>{count}</span>
            </div>
        ),
    };
});

// Mock SearchInput
jest.mock('../../components/Form/SearchInput', () => () => <div data-testid="search-input" />);

// Mock react-hot-toast
jest.mock('react-hot-toast');

describe('UpdateProduct Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        // Mock window.prompt for delete
        window.prompt = jest.fn();
        // Silence console log and error
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const mockCategories = [
        { _id: 'c1', name: 'Electronics' }
    ];

    const mockProduct = {
        _id: 'p1',
        name: 'Test Product',
        description: 'Test Desc',
        price: 100,
        quantity: 10,
        shipping: true,
        category: { _id: 'c1' },
        slug: 'test-product'
    };

    it('fetches and renders product details', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });

        const { getByPlaceholderText, getByDisplayValue } = render(
            <MemoryRouter>
                <UpdateProduct />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByDisplayValue('Test Product')).toBeInTheDocument());
        expect(getByDisplayValue('Test Desc')).toBeInTheDocument();
        expect(getByDisplayValue('100')).toBeInTheDocument();
    });

    it('updates product successfully', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        axios.put.mockResolvedValue({ data: { success: true } });

        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter>
                <UpdateProduct />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByPlaceholderText('write a name')).toHaveValue('Test Product'));
        
        fireEvent.change(getByPlaceholderText('write a name'), { target: { value: 'Updated Name' } });
        fireEvent.click(getByText('UPDATE PRODUCT'));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Product Updated Successfully'));
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
    });

    it('shows error toast when API returns success false in handleUpdate', async () => {
        // 1. Mock the initial data loading (Categories and Single Product)
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) {
                return Promise.resolve({ data: { success: true, category: mockCategories } });
            }
            if (url.includes('test-product')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.reject(new Error('not found'));
        });

        // 2. Mock the PUT request to return success: false with an error message
        const errorMessage = "Invalid product details";
        axios.put.mockResolvedValue({
            data: {
                success: false,
                message: errorMessage
            }
        });

        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter>
                <UpdateProduct />
            </MemoryRouter>
        );

        // 3. Wait for the component to populate with initial data
        await waitFor(() => expect(getByPlaceholderText('write a name')).toHaveValue('Test Product'));

        // 4. Trigger the update
        fireEvent.click(getByText('UPDATE PRODUCT'));

        // 5. Assert that toast.error was called with the message from the API
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(errorMessage);
        });

        // 6. Ensure it did NOT navigate away
        expect(mockNavigate).not.toHaveBeenCalled();
    });


    it('deletes product successfully', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        axios.delete.mockResolvedValue({ data: { success: true } });
        window.prompt.mockReturnValue('yes');

        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter>
                <UpdateProduct />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('DELETE PRODUCT')).toBeInTheDocument());
        fireEvent.click(getByText('DELETE PRODUCT'));

        expect(window.prompt).toHaveBeenCalled();
        await waitFor(() => expect(axios.delete).toHaveBeenCalled());
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Product Deleted Successfully'));
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
    });

    it('cancels deletion if prompt is falsey', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        window.prompt.mockReturnValue(null);
        const { getByText } = render(<MemoryRouter><UpdateProduct /></MemoryRouter>);
        await waitFor(() => fireEvent.click(getByText('DELETE PRODUCT')));
        expect(axios.delete).not.toHaveBeenCalled();
    });

    it('updates product with a photo', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        axios.put.mockResolvedValue({ data: { success: true } });

        const { getByText, getByLabelText } = render(
            <MemoryRouter>
                <UpdateProduct />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByLabelText('Upload Photo')).toBeInTheDocument());
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        fireEvent.change(getByLabelText('Upload Photo'), { target: { files: [file] } });

        fireEvent.click(getByText('UPDATE PRODUCT'));

        await waitFor(() => expect(axios.put).toHaveBeenCalled());
        // Verify FormData contains photo
        const calls = axios.put.mock.calls;
        const formData = calls[calls.length - 1][1];
        expect(formData.get('photo')).toBeDefined();
    });

    it('handles error in getSingleProduct', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.reject(new Error('Fetch error'));
            return Promise.reject(new Error('not found'));
        });
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        render(<MemoryRouter><UpdateProduct /></MemoryRouter>);
        await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
        consoleSpy.mockRestore();
    });

    it('handles error in getAllCategory', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.reject(new Error('Fetch error'));
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        render(<MemoryRouter><UpdateProduct /></MemoryRouter>);
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong in getting catgeory'));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });


    it('handles catch block in handleUpdate', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        axios.put.mockRejectedValue(new Error('Update error'));
        const { getByText } = render(<MemoryRouter><UpdateProduct /></MemoryRouter>);
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));
        await waitFor(() => fireEvent.click(getByText('UPDATE PRODUCT')));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('something went wrong'));
    });

    it('handles catch block in handleDelete', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        axios.delete.mockRejectedValue(new Error('Delete error'));
        window.prompt.mockReturnValue('yes');
        const { getByText } = render(<MemoryRouter><UpdateProduct /></MemoryRouter>);
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));
        await waitFor(() => fireEvent.click(getByText('DELETE PRODUCT')));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
    });

    it('handles photo upload and preview', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        const { getByLabelText, getByAltText } = render(<MemoryRouter><UpdateProduct /></MemoryRouter>);
        
        await waitFor(() => expect(getByLabelText('Upload Photo')).toBeInTheDocument());
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        fireEvent.change(getByLabelText('Upload Photo'), { target: { files: [file] } });
        
        await waitFor(() => {
            const img = getByAltText('product_photo');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'mock-url');
        });
    });

    it('sets shipping and category on change', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: true, category: mockCategories } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        const { getByLabelText, getByPlaceholderText } = render(<MemoryRouter><UpdateProduct /></MemoryRouter>);
        
        await waitFor(() => expect(getByLabelText('Select Shipping')).toBeInTheDocument());
        fireEvent.change(getByLabelText('Select Shipping'), { target: { value: "false" } });
        expect(getByLabelText('Select Shipping').value).toBe("false");

        fireEvent.change(getByLabelText('Select a category'), { target: { value: 'c1' } });
        expect(getByLabelText('Select a category').value).toBe('c1');

        fireEvent.change(getByPlaceholderText('write a description'), { target: { value: 'New Desc' } });
        expect(getByPlaceholderText('write a description').value).toBe('New Desc');

        fireEvent.change(getByPlaceholderText('write a Price'), { target: { value: '200' } });
        expect(getByPlaceholderText('write a Price').value).toBe('200');

        fireEvent.change(getByPlaceholderText('write a quantity'), { target: { value: '20' } });
        expect(getByPlaceholderText('write a quantity').value).toBe('20');
    });

    it('fetches categories with success false', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('get-category')) return Promise.resolve({ data: { success: false } });
            if (url.includes('test-product')) return Promise.resolve({ data: { product: mockProduct } });
            return Promise.reject(new Error('not found'));
        });
        render(<MemoryRouter><UpdateProduct /></MemoryRouter>);
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));
    });
});
