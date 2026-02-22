import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Contact from './Contact';

// Mocking react-icons
jest.mock('react-icons/bi', () => ({
  BiMailSend: () => <div data-testid="BiMailSend" />,
  BiPhoneCall: () => <div data-testid="BiPhoneCall" />,
  BiSupport: () => <div data-testid="BiSupport" />,
}));

// Mocking axios to avoid ESM issues in Jest
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
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

describe('Contact Page', () => {
    it('renders Contact page with contact details', () => {
        const { getByText, getByAltText } = render(
            <MemoryRouter>
                <Contact />
            </MemoryRouter>
        );

        expect(getByAltText('contactus')).toBeInTheDocument();
        expect(getByText('CONTACT US')).toBeInTheDocument();
        expect(getByText(/www.help@ecommerceapp.com/i)).toBeInTheDocument();
        expect(getByText(/012-3456789/)).toBeInTheDocument();
        expect(getByText(/1800-0000-0000/)).toBeInTheDocument();
    });
});
