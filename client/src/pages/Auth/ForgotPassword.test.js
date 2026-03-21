// Nam Dohyun
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import ForgotPassword from './ForgotPassword';

// Mocking axios.post
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: function () { },
    removeListener: function () { }
  };
};

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the forgot password form', () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText('RESET PASSWORD')).toBeInTheDocument();
    expect(getByPlaceholderText('Enter Your Email')).toBeInTheDocument();
    expect(getByPlaceholderText('Enter Your Favorite Sport Name')).toBeInTheDocument();
    expect(getByPlaceholderText('Enter Your New Password')).toBeInTheDocument();
  });

  it('should reset the password successfully', async () => {
    const mockMessage = "Password Reset Successfully";
    axios.post.mockResolvedValueOnce({ data: { success: true, message: mockMessage } });

    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByPlaceholderText('Enter Your Favorite Sport Name'), { target: { value: 'Football' } });
    fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'newpassword123' } });

    fireEvent.click(getByText('RESET'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
      email: 'test@example.com',
      answer: 'Football',
      newPassword: 'newpassword123',
    }));
    
    expect(toast.success).toHaveBeenCalledWith(mockMessage);
    await waitFor(() => expect(getByText('Login Page')).toBeInTheDocument());
  });

  it('should display error message when reset success is false', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: 'Invalid email or answer',
      },
    });

    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByPlaceholderText('Enter Your Favorite Sport Name'), { target: { value: 'wrong' } });
    fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'newpass' } });

    fireEvent.click(getByText('RESET'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Invalid email or answer');
  });

  it('should display error message on API exception', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(getByPlaceholderText('Enter Your Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByPlaceholderText('Enter Your Favorite Sport Name'), { target: { value: 'Football' } });
    fireEvent.change(getByPlaceholderText('Enter Your New Password'), { target: { value: 'pass' } });

    fireEvent.click(getByText('RESET'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
