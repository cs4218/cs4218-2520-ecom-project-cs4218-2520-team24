import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import AdminOrders from './AdminOrders';
import axios from 'axios';
import { useAuth } from '../../context/auth';

// Mocking axios
jest.mock('axios', () => ({
  get: jest.fn(),
  put: jest.fn(),
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

// Mocking antd Select and Badge
jest.mock('antd', () => {
  const React = require('react');
  return {
    Select: Object.assign(
        ({ children, onChange, defaultValue }) => (
          <select defaultValue={defaultValue} onChange={(e) => onChange(e.target.value)}>
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
            <span className="ant-badge-count">{count}</span>
        </div>
    ),
  };
});

// Mock SearchInput
jest.mock('../../components/Form/SearchInput', () => () => <div data-testid="search-input" />);

describe('AdminOrders Page', () => {
    let consoleSpy;
    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    const mockOrders = [
        {
            _id: 'o1',
            status: 'Not Process',
            buyer: { name: 'Buyer 1' },
            createAt: new Date().toISOString(),
            payment: { success: true },
            products: [{ _id: 'p1', name: 'Product 1', price: 100, description: 'Desc 1' }]
        }
    ];

    it('renders all orders and handles status change', async () => {
        useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
        axios.get.mockResolvedValue({ data: mockOrders });
        axios.put.mockResolvedValue({ data: { success: true } });

        const { getByText, getByDisplayValue } = render(
            <MemoryRouter>
                <AdminOrders />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Buyer 1')).toBeInTheDocument());

        // Change status
        await act(async () => {
            fireEvent.change(getByDisplayValue('Not Process'), { target: { value: 'Shipped' } });
        });
        
        await waitFor(() => expect(axios.put).toHaveBeenCalledWith('/api/v1/auth/order-status/o1', {
            status: 'Shipped'
        }));
    });

    it('does not call getOrders if auth token is missing', async () => {
        // Branch: if (auth?.token) is false
        useAuth.mockReturnValue([{ token: null }, jest.fn()]);

        render(
            <MemoryRouter>
                <AdminOrders />
            </MemoryRouter>
        );

        // Wait a tick to ensure useEffect logic would have run
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    it('handles error in getOrders (catch block)', async () => {
        useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
        const errorMessage = 'Network Error';
        axios.get.mockRejectedValue(new Error(errorMessage));

        render(
            <MemoryRouter>
                <AdminOrders />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
            // Verifies the catch (error) { console.log(error) } branch
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    it('handles error in handleChange (catch block)', async () => {
        useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
        axios.get.mockResolvedValue({ data: mockOrders });
        
        // Setup the put request to fail
        const putError = new Error('Update Failed');
        axios.put.mockRejectedValue(putError);

        const { getByDisplayValue } = render(
            <MemoryRouter>
                <AdminOrders />
            </MemoryRouter>
        );

        // Ensure orders are loaded first
        await waitFor(() => expect(getByDisplayValue('Not Process')).toBeInTheDocument());

        // Trigger the status change
        fireEvent.change(getByDisplayValue('Not Process'), { target: { value: 'Shipped' } });

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
            // Verifies the catch block in handleChange
            expect(consoleSpy).toHaveBeenCalledWith(putError);
        });
        
        // Ensure getOrders is NOT called a second time if the update fails
        // (Since getOrders() is inside the try block after the await axios.put)
        expect(axios.get).toHaveBeenCalledTimes(1); 
    });

    it('renders "Failed" when payment.success is false', async () => {
        const mockFailedOrder = [
            {
                _id: 'failed_order_1', // Ensure unique ID
                status: 'Not Process',
                buyer: { name: 'Buyer 2' },
                createAt: new Date().toISOString(),
                payment: { success: false },
                products: [{ _id: 'p2', name: 'Product 2', price: 50, description: 'Test Desc' }]
            }
        ];

        useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
        axios.get.mockResolvedValue({ data: mockFailedOrder });

        let screen;
        await act(async () => {
            screen = render(
                <MemoryRouter>
                    <AdminOrders />
                </MemoryRouter>
            );
        });

        const failedText = await screen.findByText('Failed');
        expect(failedText).toBeInTheDocument();
        expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });

    it('renders "Success" when payment.success is true', async () => {
        // 1. Arrange: Mock a successful payment order
        const mockSuccessOrder = [
            {
                _id: 'o3',
                status: 'Not Process',
                buyer: { name: 'Buyer 3' },
                createAt: new Date().toISOString(),
                payment: { success: true }, // This triggers the "Success" branch
                products: [{ _id: 'p3', name: 'Product 3', price: 75, description: 'This is a test description' }]
            }
        ];

        useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
        axios.get.mockResolvedValue({ data: mockSuccessOrder });

        // 2. Act: Render the component
        const { getByText, queryByText } = render(
            <MemoryRouter>
                <AdminOrders />
            </MemoryRouter>
        );

        // 3. Assert: Check the UI displays "Success" and NOT "Failed"
        await waitFor(() => {
            expect(getByText('Success')).toBeInTheDocument();
            expect(queryByText('Failed')).not.toBeInTheDocument();
        });
    });
});
