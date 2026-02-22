import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import CreateCategory from './CreateCategory';
import axios from 'axios';
import toast from 'react-hot-toast';

// Mocking axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
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

// Mock CategoryForm
jest.mock('../../components/Form/CategoryForm', () => {
    return ({ handleSubmit, value, setValue }) => (
        <form onSubmit={handleSubmit}>
            <input 
                aria-label="category-input"
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
            />
            <button type="submit">Submit</button>
        </form>
    );
});

// Mock antd Modal and Badge
jest.mock('antd', () => {
    const React = require('react');
    return {
        Modal: ({ children, open, onCancel }) => open ? (
            <div data-testid="antd-modal">
                <button onClick={onCancel}>Cancel</button>
                {children}
            </div>
        ) : null,
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

describe('CreateCategory Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Silence console log and error
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const mockCategories = [
        { _id: '1', name: 'Electronics', slug: 'electronics' },
        { _id: '2', name: 'Mobile', slug: 'mobile' }
    ];

    it('renders and fetches categories', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });

        const { getByText } = render(
            <MemoryRouter>
                <CreateCategory />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Electronics')).toBeInTheDocument());
        await waitFor(() => expect(getByText('Mobile')).toBeInTheDocument());
    });

    it('creates a new category successfully', async () => {
        axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
                 .mockResolvedValue({ data: { success: true, category: [...mockCategories, { _id: '3', name: 'New Category' }] } });
        axios.post.mockResolvedValue({ data: { success: true } });

        const { getByText, getByLabelText } = render(
            <MemoryRouter>
                <CreateCategory />
            </MemoryRouter>
        );

        fireEvent.change(getByLabelText('category-input'), { target: { value: 'New Category' } });
        fireEvent.click(getByText('Submit'));

        await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/v1/category/create-category', {
            name: 'New Category'
        }));
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('New Category is created'));

        await waitFor(() => expect(getByText('New Category')).toBeInTheDocument());
        expect(getByText('Electronics')).toBeInTheDocument();
        expect(getByText('Mobile')).toBeInTheDocument();
    });

    it('updates a category via modal', async () => {
        axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
                 .mockResolvedValue({ data: { success: true, category: [{ _id: '1', name: 'Electronics Updated' }, mockCategories[1]] } });
        axios.put.mockResolvedValue({ data: { success: true } });

        const { getAllByText, getByTestId, getAllByLabelText, getByText } = render(
            <MemoryRouter>
                <CreateCategory />
            </MemoryRouter>
        );

        await waitFor(() => expect(getAllByText('Edit')[0]).toBeInTheDocument());
        fireEvent.click(getAllByText('Edit')[0]);

        await waitFor(() => expect(getByTestId('antd-modal')).toBeInTheDocument());
        
        const modalInput = getAllByLabelText('category-input')[1];
        fireEvent.change(modalInput, { target: { value: 'Electronics Updated' } });
        
        const submitButtons = getAllByText('Submit');
        fireEvent.click(submitButtons[1]);

        await waitFor(() => expect(axios.put).toHaveBeenCalledWith('/api/v1/category/update-category/1', {
            name: 'Electronics Updated'
        }));
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Electronics Updated is updated'));
        await waitFor(() => expect(getByText('Electronics Updated')).toBeInTheDocument());
        expect(getByText('Mobile')).toBeInTheDocument();
    });

    it('deletes a category', async () => {
        axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } })
                 .mockResolvedValue({ data: { success: true, category: [mockCategories[1]] } });
        axios.delete.mockResolvedValue({ data: { success: true, category: { name: 'Electronics' } } });

        const { getAllByText, queryByText } = render(
            <MemoryRouter>
                <CreateCategory />
            </MemoryRouter>
        );

        await waitFor(() => expect(getAllByText('Delete')[0]).toBeInTheDocument());
        
        fireEvent.click(getAllByText('Delete')[0]);

        await waitFor(() => expect(axios.delete).toHaveBeenCalledWith('/api/v1/category/delete-category/1'));
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Electronics is deleted'));
        await waitFor(() => expect(queryByText('Electronics')).not.toBeInTheDocument());
        expect(queryByText('Mobile')).toBeInTheDocument();
    });

    it('handles error in getAllCategory', async () => {
        axios.get.mockRejectedValue(new Error('Fetch error'));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong in getting category'));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('handles data.success false in getAllCategory', async () => {
        axios.get.mockResolvedValue({ data: { success: false } });
        render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));
        // No action taken if success is false, so we just verify it was called
    });

    it('handles data.success false in handleSubmit', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: [] } });
        axios.post.mockResolvedValue({ data: { success: false, message: 'Creation failed' } });
        const { getByText, getByLabelText } = render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        fireEvent.change(getByLabelText('category-input'), { target: { value: 'New' } });
        fireEvent.click(getByText('Submit'));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Creation failed'));
    });

    it('handles catch block in handleSubmit', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: [] } });
        axios.post.mockRejectedValue(new Error('Post error'));
        const { getByText, getByLabelText } = render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        fireEvent.change(getByLabelText('category-input'), { target: { value: 'New' } });
        fireEvent.click(getByText('Submit'));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong in input form'));
    });

    it('handles data.success false in handleUpdate', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        axios.put.mockResolvedValue({ data: { success: false, message: 'Update failed' } });
        const { getAllByText, getByTestId } = render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        await waitFor(() => fireEvent.click(getAllByText('Edit')[0]));
        await waitFor(() => expect(getByTestId('antd-modal')).toBeInTheDocument());
        fireEvent.click(getAllByText('Submit')[1]);
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Update failed'));
    });

    it('handles catch block in handleUpdate', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        axios.put.mockRejectedValue(new Error('Update error'));
        const { getAllByText, getByTestId } = render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        await waitFor(() => fireEvent.click(getAllByText('Edit')[0]));
        await waitFor(() => expect(getByTestId('antd-modal')).toBeInTheDocument());
        fireEvent.click(getAllByText('Submit')[1]);
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
    });

    it('handles data.success false in handleDelete', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        axios.delete.mockResolvedValue({ data: { success: false, message: 'Delete failed' } });
        const { getAllByText } = render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        await waitFor(() => fireEvent.click(getAllByText('Delete')[0]));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Delete failed'));
        await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category'));
    });

    it('handles catch block in handleDelete', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        axios.delete.mockRejectedValue(new Error('Delete error'));
        const { getAllByText } = render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        await waitFor(() => fireEvent.click(getAllByText('Delete')[0]));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
    });

    it('closes modal onCancel', async () => {
        axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
        const { getAllByText, queryByTestId } = render(<MemoryRouter><CreateCategory /></MemoryRouter>);
        await waitFor(() => fireEvent.click(getAllByText('Edit')[0]));
        fireEvent.click(getAllByText('Cancel')[0]);
        expect(queryByTestId('antd-modal')).not.toBeInTheDocument();
    });
});
