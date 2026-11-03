import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeList from './RecipeList';

describe('RecipeList Component', () => {
  const sampleRecipes = [
    {
      id: '1',
      title: 'カレーライス',
      isFavorite: true,
      notes: '辛口メモ',
      link: 'https://example.com/curry',
    },
    {
      id: '2',
      title: '肉じゃが',
      isFavorite: false,
      notes: '煮込みメモ',
      link: '',
    },
  ];

  it('renders recipe cards with title and notes', () => {
    render(
      <RecipeList
        title="レシピ一覧"
        recipes={sampleRecipes}
        handleToggleFavorite={vi.fn()}
        handleDeleteRecipe={vi.fn()}
        handleOpenModal={vi.fn()}
      />
    );

    expect(screen.getByText('レシピ一覧')).toBeInTheDocument();
    expect(screen.getByText('カレーライス')).toBeInTheDocument();
    expect(screen.getByText('辛口メモ')).toBeInTheDocument();
    expect(screen.getByText('肉じゃが')).toBeInTheDocument();
    expect(screen.getByText('参考')).toBeInTheDocument(); // link
  });

  it('triggers handleOpenModal when a card is clicked', () => {
    const handleOpenModal = vi.fn();
    render(
      <RecipeList
        title="レシピ一覧"
        recipes={sampleRecipes}
        handleToggleFavorite={vi.fn()}
        handleDeleteRecipe={vi.fn()}
        handleOpenModal={handleOpenModal}
      />
    );

    fireEvent.click(screen.getByText('カレーライス'));
    expect(handleOpenModal).toHaveBeenCalledWith(sampleRecipes[0]);
  });

  it('opens delete confirmation dialog and triggers handleDeleteRecipe upon confirmation', () => {
    const handleDeleteRecipe = vi.fn();
    render(
      <RecipeList
        title="レシピ一覧"
        recipes={sampleRecipes}
        handleToggleFavorite={vi.fn()}
        handleDeleteRecipe={handleDeleteRecipe}
        handleOpenModal={vi.fn()}
      />
    );

    // Click delete icon for the first recipe
    const deleteButtons = screen.getAllByLabelText('delete');
    fireEvent.click(deleteButtons[0]);

    // Confirmation dialog should be displayed
    expect(screen.getByText('レシピを削除しますか？')).toBeInTheDocument();

    // Click confirm delete button
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    expect(handleDeleteRecipe).toHaveBeenCalledWith('1');
  });

  it('triggers handleToggleFavorite when star icon is clicked without opening card modal', () => {
    const handleToggleFavorite = vi.fn();
    const handleOpenModal = vi.fn();
    render(
      <RecipeList
        title="レシピ一覧"
        recipes={sampleRecipes}
        handleToggleFavorite={handleToggleFavorite}
        handleDeleteRecipe={vi.fn()}
        handleOpenModal={handleOpenModal}
      />
    );

    const favoriteButtons = screen.getAllByLabelText('add to favorites');
    fireEvent.click(favoriteButtons[0]);

    expect(handleToggleFavorite).toHaveBeenCalledWith(sampleRecipes[0]);
    expect(handleOpenModal).not.toHaveBeenCalled();
  });
});
