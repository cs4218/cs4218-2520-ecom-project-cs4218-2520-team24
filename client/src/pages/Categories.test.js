// Nam Dohyun, A0226590A
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Categories from './Categories';
import useCategory from '../hooks/useCategory';

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

jest.mock('../hooks/useCategory', () => jest.fn());

// Mocking axios to avoid ESM issues in Jest
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    headers: {
      common: {}
    }
  }
}));

describe('Categories Page', () => {
    it('renders all categories', () => {
        const mockCategories = [
            { _id: '1', name: 'Electronics', slug: 'electronics' },
            { _id: '2', name: 'Clothing', slug: 'clothing' }
        ];
        useCategory.mockReturnValue(mockCategories);

        const { getAllByText } = render(
            <MemoryRouter>
                <Categories />
            </MemoryRouter>
        );

        expect(getAllByText('Electronics').length).toBeGreaterThan(0);
        expect(getAllByText('Clothing').length).toBeGreaterThan(0);
    });

    it('renders no categories when list is empty', () => {
        useCategory.mockReturnValue([]);

        const { queryAllByRole } = render(
            <MemoryRouter>
                <Categories />
            </MemoryRouter>
        );

        const links = queryAllByRole('link');
        // Filter links to find only those that would be category links (btn-primary)
        const categoryLinks = links.filter(link => link.classList.contains('btn-primary'));
        expect(categoryLinks.length).toBe(0);
    });
});
