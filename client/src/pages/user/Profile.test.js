import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Profile from './Profile';
import axios from 'axios';
import { useAuth } from '../../context/auth';
import toast from 'react-hot-toast';

// Mocking axios
jest.mock('axios', () => ({
  put: jest.fn(),
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

// Mock react-hot-toast
jest.mock('react-hot-toast');

describe('User Profile Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockUser = {
        name: 'John User',
        email: 'john@example.com',
        phone: '1234567890',
        address: '456 User Lane'
    };

    it('pre-fills form with user data from auth context', () => {
        useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);

        const { getByPlaceholderText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        expect(getByPlaceholderText('Enter Your Name').value).toBe('John User');
        expect(getByPlaceholderText('Enter Your Email').value).toBe('john@example.com');
        expect(getByPlaceholderText('Enter Your Phone').value).toBe('1234567890');
        expect(getByPlaceholderText('Enter Your Address').value).toBe('456 User Lane');
    });

    it('submits updated profile data successfully', async () => {
        const setAuthMock = jest.fn();
        useAuth.mockReturnValue([{ user: mockUser, token: 'fake-token' }, setAuthMock]);
        
        const updatedUser = { ...mockUser, name: 'John Updated' };
        axios.put.mockResolvedValue({ data: { updatedUser } });

        // Mock localStorage
        Storage.prototype.getItem = jest.fn(() => JSON.stringify({ user: mockUser }));
        Storage.prototype.setItem = jest.fn();

        const { getByPlaceholderText, getByText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Name'), { target: { value: 'John Updated' } });
        fireEvent.click(getByText('UPDATE'));

        await waitFor(() => expect(axios.put).toHaveBeenCalledWith('/api/v1/auth/profile', {
            name: 'John Updated',
            email: 'john@example.com',
            password: '',
            phone: '1234567890',
            address: '456 User Lane'
        }));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Profile Updated Successfully'));
        expect(setAuthMock).toHaveBeenCalled();
        expect(Storage.prototype.setItem).toHaveBeenCalledWith('auth', JSON.stringify({ user: updatedUser }));
    });

    it('shows error toast when API returns error', async () => {
        useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);
        axios.put.mockResolvedValue({ data: { error: 'Invalid data' } });

        const { getByText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.click(getByText('UPDATE'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid data'));
        expect(axios.put).toHaveBeenCalled();
    });

    it('handles API failure and shows error toast', async () => {
        useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const error = new Error('Network Error');
        axios.put.mockRejectedValue(error);

        const { getByText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.click(getByText('UPDATE'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong'));
        expect(consoleSpy).toHaveBeenCalledWith(error);
        consoleSpy.mockRestore();
    });

    it('updates state when form fields are changed', () => {
        useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);

        const { getByPlaceholderText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        fireEvent.change(getByPlaceholderText('Enter Your Name'), { target: { value: 'New Name' } });
        fireEvent.change(getByPlaceholderText('Enter Your Password'), { target: { value: 'newpassword' } });
        fireEvent.change(getByPlaceholderText('Enter Your Phone'), { target: { value: '9999999999' } });
        fireEvent.change(getByPlaceholderText('Enter Your Address'), { target: { value: 'New Address' } });

        expect(getByPlaceholderText('Enter Your Name').value).toBe('New Name');
        expect(getByPlaceholderText('Enter Your Password').value).toBe('newpassword');
        expect(getByPlaceholderText('Enter Your Phone').value).toBe('9999999999');
        expect(getByPlaceholderText('Enter Your Address').value).toBe('New Address');
    });

    it('updates email state when email field is changed (even if disabled)', () => {
        useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);

        const { getByPlaceholderText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        const emailInput = getByPlaceholderText('Enter Your Email');
        fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });
        expect(emailInput.value).toBe('newemail@example.com');
    });

    it('handles missing or null user fields gracefully', () => {
        const incompleteUser = {
            name: null,
            email: null,
            phone: undefined,
            address: null
        };
        useAuth.mockReturnValue([{ user: incompleteUser }, jest.fn()]);

        const { getByPlaceholderText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        expect(getByPlaceholderText('Enter Your Name').value).toBe('');
        expect(getByPlaceholderText('Enter Your Email').value).toBe('');
        expect(getByPlaceholderText('Enter Your Phone').value).toBe('');
        expect(getByPlaceholderText('Enter Your Address').value).toBe('');
    });

    it('does not update state if auth.user is missing', () => {
        useAuth.mockReturnValue([{}, jest.fn()]);

        const { getByPlaceholderText } = render(
            <MemoryRouter>
                <Profile />
            </MemoryRouter>
        );

        expect(getByPlaceholderText('Enter Your Name').value).toBe('');
        expect(getByPlaceholderText('Enter Your Phone').value).toBe('');
        expect(getByPlaceholderText('Enter Your Address').value).toBe('');
    });
});
