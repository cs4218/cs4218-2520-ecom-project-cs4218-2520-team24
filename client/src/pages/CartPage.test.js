// Nam Dohyun, A0226590A
import React, { useEffect } from 'react'; // Added useEffect for the mock
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import CartPage from './CartPage';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DropIn from "braintree-web-drop-in-react";

// 1. MOCK DEPENDENCIES
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("react-hot-toast");

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: { headers: { common: {} } }
}));

// Mock DropIn as a jest.fn
jest.mock('braintree-web-drop-in-react', () => jest.fn());

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(),
}));

jest.mock('../context/search', () => ({
  useSearch: () => [{ keyword: '' }, jest.fn()],
}));

jest.mock('../hooks/useCategory', () => () => []);

jest.mock('react-icons/ai', () => ({
  AiFillWarning: () => <div data-testid="AiFillWarning" />,
}));

describe('CartPage Component', () => {
    const mockNavigate = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({ data: { clientToken: 'fake-token' } });
        useNavigate.mockReturnValue(mockNavigate);
        
        Object.defineProperty(window, 'localStorage', {
            value: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
            writable: true
        });

        // Consistent Mock: Uses setTimeout + act to avoid lifecycle collisions
        DropIn.mockImplementation(({ onInstance }) => {
            useEffect(() => {
                const timer = setTimeout(() => {
                    act(() => {
                        onInstance({
                            requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "fake-nonce" }),
                        });
                    });
                }, 0);
                return () => clearTimeout(timer);
            }, [onInstance]);
            return <div data-testid="braintree-dropin" />;
        });
    });

    const mockCart = [
        { _id: '1', name: 'Test Product 1', description: 'Description 1', price: 100 },
        { _id: '2', name: 'Test Product 2', description: 'Description 2', price: 200 }
    ];

    const mockAuth = {
        user: { name: 'John Doe', address: '123 Main St' },
        token: 'fake-token'
    };

    it('renders CartPage with items and total price', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        useAuth.mockReturnValue([mockAuth, jest.fn()]);
        useCart.mockReturnValue([mockCart, jest.fn()]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        expect(await screen.findByText(/Hello John Doe/i)).toBeInTheDocument();
        expect(screen.getByText('Total : $300.00')).toBeInTheDocument();
    });

    it('renders guest greeting and empty cart message', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        
        useAuth.mockReturnValue([{}, jest.fn()]); // No user, no token
        useCart.mockReturnValue([[], jest.fn()]); // Empty cart

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        expect(screen.getByText(/Hello Guest/i)).toBeInTheDocument();
        expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    });

    it('renders user greeting and empty cart message when logged in', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        
        useAuth.mockReturnValue([{ user: { name: "John" }, token: "123" }, jest.fn()]);
        useCart.mockReturnValue([[], jest.fn()]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        expect(screen.getByText(/Hello John/i)).toBeInTheDocument();
        expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    });

    it('renders prompt to login when guest has items in cart', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        
        useAuth.mockReturnValue([{}, jest.fn()]);
        useCart.mockReturnValue([mockCart, jest.fn()]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        expect(screen.getByText(/You Have 2 items in your cart please login to checkout !/i)).toBeInTheDocument();
    });

    it('renders item count without login prompt when logged in', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        
        useAuth.mockReturnValue([{ user: { name: "John" }, token: "123" }, jest.fn()]);
        useCart.mockReturnValue([mockCart, jest.fn()]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        // Check that the text contains the count but NOT the login prompt
        const cartMsg = screen.getByText(/You Have 2 items in your cart/i);
        expect(cartMsg).toBeInTheDocument();
        expect(cartMsg).not.toHaveTextContent("please login to checkout !");
    });

    it('navigates to profile when "Update Address" is clicked', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        
        // Scenario: User is logged in and has an address
        useAuth.mockReturnValue([{ 
            user: { name: "John", address: "123 Main St" }, 
            token: "fake-token" 
        }, jest.fn()]);
        useCart.mockReturnValue([mockCart, jest.fn()]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        const updateBtn = screen.getByText(/Update Address/i);
        fireEvent.click(updateBtn);

        // Verify simple navigation
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
    });

    it('navigates to profile when "Update Address" is clicked (User has token but no address)', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        
        // Setup: Logged in BUT address is empty/null
        useAuth.mockReturnValue([{ 
            user: { name: "John", address: "" }, 
            token: "fake-token" 
        }, jest.fn()]);
        useCart.mockReturnValue([mockCart, jest.fn()]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        const updateBtn = screen.getByRole('button', { name: /Update Address/i });
        fireEvent.click(updateBtn);

        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
    });

    it('navigates to login with state when guest clicks "Please Login to checkout"', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        
        // Scenario: User is NOT logged in (No user, no token)
        useAuth.mockReturnValue([{ user: null, token: "" }, jest.fn()]);
        useCart.mockReturnValue([mockCart, jest.fn()]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        // 1. Verify the correct button text is rendered for a guest
        const loginBtn = screen.getByRole('button', { name: /Please Login to checkout/i });
        expect(loginBtn).toBeInTheDocument();

        // 2. Simulate the click
        fireEvent.click(loginBtn);

        // 3. Verify navigation specifically includes the state for redirecting back
        expect(mockNavigate).toHaveBeenCalledWith("/login", {
            state: "/cart",
        });
    });

    it('should handle error in totalPrice calculation', async () => {
        const { useCart } = require('../context/cart');
        const { useAuth } = require('../context/auth');
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

       const corruptCart = [{ 
            _id: '1', 
            name: 'Broken Item', 
            description: 'Description',
            price: 100n 
        }];

        useCart.mockReturnValue([corruptCart, jest.fn()]); 
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        // The component will call totalPrice() during render, hitting the catch block
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should remove an item from the cart', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        const setCartMock = jest.fn();
        useAuth.mockReturnValue([mockAuth, jest.fn()]);
        useCart.mockReturnValue([mockCart, setCartMock]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        const removeButtons = screen.getAllByText('Remove');
        fireEvent.click(removeButtons[0]);

        expect(setCartMock).toHaveBeenCalledWith([mockCart[1]]);
    });

    it('should keep the cart intact when attempting to remove a non-existent product ID', async () => {
        const { useCart } = require('../context/cart');
        const { useAuth } = require('../context/auth');
        const setCartMock = jest.fn();
        const initialCart = [{ _id: '1', name: 'Keep Me', description: 'Description 1', price: 100 }];

        useAuth.mockReturnValue([mockAuth, jest.fn()]);
        useCart.mockReturnValue([initialCart, setCartMock]);

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        const spy = jest.spyOn(Array.prototype, 'findIndex').mockReturnValue(-1);
        fireEvent.click(screen.getByText('Remove'));
        
        // Ensure we didn't call setCart with an empty array if findIndex failed
        expect(setCartMock).not.toHaveBeenCalledWith([]);
        spy.mockRestore();
    });

    it('should handle error when removing an item from cart fails', async () => {
        const { useCart } = require('../context/cart');
        const { useAuth } = require('../context/auth');
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        useCart.mockReturnValue([mockCart, jest.fn()]);
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        // Mock localStorage to throw an error
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error("LocalStorage Error");
        });
        const findIndexSpy = jest.spyOn(Array.prototype, 'findIndex').mockImplementation(() => {
            throw new Error("FindIndex Crash");
        });
        
        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });


        const removeButtons = screen.getAllByText('Remove');
        fireEvent.click(removeButtons[0]);

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        
        consoleSpy.mockRestore();
        jest.restoreAllMocks(); // Important to restore Storage prototype
    });

    it('should handle error when getToken API call fails', async () => {
        const { useCart } = require('../context/cart');
        const { useAuth } = require('../context/auth');
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        useCart.mockReturnValue([mockCart, jest.fn()]);
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        // Force axios.get to reject
        axios.get.mockRejectedValueOnce(new Error("API Error"));

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        // Wait for the async getToken call to resolve and hit the catch
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    it('should complete payment successfully', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        const setCartMock = jest.fn();
        useAuth.mockReturnValue([mockAuth, jest.fn()]);
        useCart.mockReturnValue([mockCart, setCartMock]);

        const mockInstance = {
            requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "fake-nonce" }),
        };
        axios.post.mockResolvedValue({ data: { success: true } });

        // FIX: Applied setTimeout + act to the local mock override
        DropIn.mockImplementation(({ onInstance }) => {
            useEffect(() => {
                const timer = setTimeout(() => {
                    act(() => { onInstance(mockInstance); });
                }, 0);
                return () => clearTimeout(timer);
            }, [onInstance]);
            return <div data-testid="braintree-dropin" />;
        });

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        const paymentBtn = await screen.findByText(/Make Payment/i);
        await waitFor(() => expect(paymentBtn).not.toBeDisabled());

        await act(async () => {
            fireEvent.click(paymentBtn);
        });

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
            expect(setCartMock).toHaveBeenCalledWith([]);
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
        });
    });

    it('should handle payment error gracefully', async () => {
        const { useAuth } = require('../context/auth');
        const { useCart } = require('../context/cart');
        useAuth.mockReturnValue([mockAuth, jest.fn()]);
        useCart.mockReturnValue([mockCart, jest.fn()]);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const mockInstance = {
            requestPaymentMethod: jest.fn().mockRejectedValue(new Error("Payment Failed")),
        };
        
        // FIX: Applied setTimeout + act here as well
        DropIn.mockImplementation(({ onInstance }) => {
            useEffect(() => {
                const timer = setTimeout(() => {
                    act(() => { onInstance(mockInstance); });
                }, 0);
                return () => clearTimeout(timer);
            }, [onInstance]);
            return <div data-testid="braintree-dropin" />;
        });

        await act(async () => {
            render(<MemoryRouter><CartPage /></MemoryRouter>);
        });

        const paymentBtn = await screen.findByText(/Make Payment/i);
        await waitFor(() => expect(paymentBtn).not.toBeDisabled());
        
        await act(async () => { fireEvent.click(paymentBtn); });

        await waitFor(() => {
            expect(paymentBtn).not.toBeDisabled();
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

        consoleSpy.mockRestore();
    });
});