import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import About from './About';

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

describe('About Page', () => {
    it('renders About page with image and text', () => {
        const { getByText, getByAltText } = render(
            <MemoryRouter>
                <About />
            </MemoryRouter>
        );

        expect(getByAltText('contactus')).toBeInTheDocument();
        expect(getByText('Add text')).toBeInTheDocument();
    });
});
