// Nam Dohyun, A0226590A
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Pagenotfound from './Pagenotfound';

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

describe('Pagenotfound Page', () => {
    it('renders Page Not Found with 404 message and Go Back link', () => {
        const { getByText } = render(
            <MemoryRouter>
                <Pagenotfound />
            </MemoryRouter>
        );

        expect(getByText('404')).toBeInTheDocument();
        expect(getByText('Oops ! Page Not Found')).toBeInTheDocument();
        expect(getByText('Go Back')).toBeInTheDocument();
    });
});
