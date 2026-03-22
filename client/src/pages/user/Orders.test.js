// Nam Dohyun, A0226590A
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Orders from './Orders';
import axios from 'axios';
import { useAuth } from '../../context/auth';

// Mocking axios
jest.mock('axios', () => ({
  get: jest.fn(),
  defaults: {
    headers: {
      common: {}
    }
  }
}));

// Mocking necessary contexts and hooks
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

// Mock UserMenu
jest.mock('../../components/UserMenu', () => () => <div data-testid="user-menu" />);

describe('User Orders Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all orders for the user', async () => {
        const mockAuth = { token: 'fake-token' };
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        const mockOrders = [
            {
                _id: 'o1',
                status: 'Not Process',
                buyer: { name: 'John User' },
                createAt: new Date().toISOString(),
                payment: { success: true },
                products: [
                    { _id: 'p1', name: 'Product 1', description: 'Desc 1', price: 100 }
                ]
            }
        ];
        axios.get.mockResolvedValue({ data: mockOrders });

        const { getByText } = render(
            <MemoryRouter>
                <Orders />
            </MemoryRouter>
        );

        await waitFor(() => expect(getByText('Not Process')).toBeInTheDocument());
        expect(getByText('John User')).toBeInTheDocument();
        expect(getByText('Success')).toBeInTheDocument();
        expect(getByText('Product 1')).toBeInTheDocument();
    });

    it('fails to get orders and logs the error', async () => {
        // 1. Spy on 'error' instead of 'log' (usually more standard)
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        const mockAuth = { token: 'fake-token' };
        useAuth.mockReturnValue([mockAuth, jest.fn()]);
        
        // 2. Mock the rejection
        const mockError = new Error('Failed to get orders');
        axios.get.mockRejectedValue(mockError);

        render(
            <MemoryRouter>
                <Orders />
            </MemoryRouter>
        );

        // 3. Wait specifically for the spy to be called 
        // This ensures the async catch block has finished
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });

        // 4. Cleanup
        consoleSpy.mockRestore();
    });


    it('does not fetch orders if auth token is missing', async () => {
        // Mock useAuth to return no token
        useAuth.mockReturnValue([ { token: "" }, jest.fn()]);

        render(
            <MemoryRouter>
                <Orders />
            </MemoryRouter>
        );

        // Verify axios.get was never called
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('renders "Failed" when payment success is false', async () => {
        useAuth.mockReturnValue([{ token: 'fake-token' }, jest.fn()]);

        const mockOrders = [
            {
                _id: 'o2',
                status: 'Not Process',
                buyer: { name: 'Jane User' },
                createAt: new Date().toISOString(),
                payment: { success: false }, // Trigger the "Failed" path
                products: []
            }
        ];
        axios.get.mockResolvedValue({ data: mockOrders });

        const { getByText, queryByText } = render(
            <MemoryRouter>
                <Orders />
            </MemoryRouter>
        );

        // Wait for the text to appear in the table cell
        await waitFor(() => expect(getByText('Failed')).toBeInTheDocument());
        
        // Safety check to ensure "Success" is NOT there
        expect(queryByText('Success')).not.toBeInTheDocument();
    });
});
