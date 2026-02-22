import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import CreateProduct from './CreateProduct';
import axios from 'axios';
import toast from 'react-hot-toast';

// Mocking axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  defaults: { headers: { common: {} } }
}));

// Mocking necessary contexts
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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
            ({ children, onChange, placeholder }) => (
                <select aria-label={placeholder} onChange={(e) => onChange(e.target.value)}>
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

describe('CreateProduct Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock URL.createObjectURL for photo upload
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        // Silence console log and error
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const mockCategories = [
        { _id: '1', name: 'Electronics' },
        { _id: '2', name: 'Clothing' }
    ];

    it('renders and fetches categories', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });

        const { getByText, getByPlaceholderText } = render(
            <MemoryRouter>
                <CreateProduct />
            </MemoryRouter>
        );

        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));
        expect(getByText('Create Product')).toBeInTheDocument();
    });

    it('creates a product successfully with an image upload', async () => {
        // 1. Mock the API responses
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        // Note: Component logic is now fixed, so we return success: true
        axios.post.mockResolvedValue({ data: { success: true } });

        // 2. Mock URL.createObjectURL (since JSDOM doesn't implement it)
        global.URL.createObjectURL = jest.fn(() => 'mock-url');

        const { getByPlaceholderText, getByText, container } = render(
            <MemoryRouter>
                <CreateProduct />
            </MemoryRouter>
        );

        // 3. Create a dummy file
        const file = new File(['(⌐□_□)'], 'test-photo.png', { type: 'image/png' });

        // 4. Input text data
        fireEvent.change(getByPlaceholderText('write a name'), { target: { value: 'New Product' } });
        fireEvent.change(getByPlaceholderText('write a description'), { target: { value: 'Product Description' } });
        fireEvent.change(getByPlaceholderText('write a Price'), { target: { value: '100' } });
        fireEvent.change(getByPlaceholderText('write a quantity'), { target: { value: '10' } });

        // 5. Simulate File Upload
        // Since the input is hidden, we find it by its 'name' attribute or selector
        const fileInput = container.querySelector('input[type="file"]');
        fireEvent.change(fileInput, { target: { files: [file] } });

        // 6. Check if image preview appears (Optional but good UX check)
        await waitFor(() => {
            expect(getByText('test-photo.png')).toBeInTheDocument();
        });

        // 7. Submit form
        fireEvent.click(getByText('CREATE PRODUCT'));

        // 8. Verify success
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Product Created Successfully'));
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
    }); 

    it('handles data.success false in getAllCategory', async () => {
        axios.get.mockResolvedValue({ data: { success: false } });
        render(<MemoryRouter><CreateProduct /></MemoryRouter>);
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));
    });

    it('handles error in getAllCategory', async () => {
        axios.get.mockRejectedValue(new Error('Fetch error'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        render(<MemoryRouter><CreateProduct /></MemoryRouter>);
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something wwent wrong in getting catgeory'));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('shows error toast when data.success is false (the else block)', async () => {
        // 1. Mock the initial category fetch
        axios.get.mockResolvedValue({ 
            data: { success: true, category: mockCategories } 
        });

        // 2. Mock the POST response to return success: false with a message
        axios.post.mockResolvedValue({ 
            data: { 
                success: false, 
                message: "Product already exists" 
            } 
        });

        const { getByText } = render(
            <MemoryRouter>
                <CreateProduct />
            </MemoryRouter>
        );

        // 3. Click the Create button
        fireEvent.click(getByText('CREATE PRODUCT'));

        // 4. Verify that toast.error was called with the specific message from the server
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Product already exists");
        });

        // 5. Ensure navigate was NOT called (user should stay on the page to fix errors)
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles catch block in handleCreate', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        const mockError = {
            response: {
                data: {
                    error: "Database connection failed"
                }
            }
        };
        axios.post.mockRejectedValue(mockError);
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        const { getByText } = render(
            <MemoryRouter>
                <CreateProduct />
            </MemoryRouter>
        );

        // 2. Trigger the create function
        fireEvent.click(getByText('CREATE PRODUCT'));
        
        // 3. Verify the toast was called with the nested error string
        await waitFor(() => 
            expect(toast.error).toHaveBeenCalledWith('Database connection failed')
        );
        
        consoleSpy.mockRestore();
    });

    it('handles photo upload and preview', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        const { getByLabelText, getByAltText } = render(<MemoryRouter><CreateProduct /></MemoryRouter>);
        
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        const input = getByLabelText('Upload Photo');
        
        fireEvent.change(input, { target: { files: [file] } });
        
        await waitFor(() => expect(getByAltText('product_photo')).toBeInTheDocument());
        expect(getByAltText('product_photo')).toHaveAttribute('src', 'mock-url');
    });

    it('sets shipping state on change', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        const { getByLabelText } = render(<MemoryRouter><CreateProduct /></MemoryRouter>);
        
        const select = getByLabelText('Select Shipping');
        fireEvent.change(select, { target: { value: '1' } });
        
        expect(select.value).toBe('1');
    });
});
