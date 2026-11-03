import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeView from './RecipeView';

describe('RecipeView Component', () => {
  const summaryRecipe = {
    id: '1',
    title: 'カレーライス',
    notes: '辛口メモ',
    link: 'https://example.com/curry',
  };

  const detailedRecipe = {
    ...summaryRecipe,
    ingredients: [
      { name: '玉ねぎ', quantity: '2個' },
      { name: 'カレールー', quantity: '1箱' },
    ],
    steps: [
      { description: '玉ねぎを炒める', imageUrls: ['https://example.com/step1.jpg'] },
      { description: '水を加えて煮込む', imageUrls: [] },
    ],
  };

  it('renders loading spinner and disables edit button when isLoadingDetail is true', () => {
    render(
      <RecipeView
        recipe={summaryRecipe}
        isLoadingDetail={true}
        handleClose={vi.fn()}
        handleOpenEditModal={vi.fn()}
      />
    );

    expect(screen.getByText('カレーライス')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '編集' })).toBeDisabled();
    expect(screen.queryByText('玉ねぎ')).not.toBeInTheDocument();
  });

  it('renders ingredients and steps when loaded', () => {
    render(
      <RecipeView
        recipe={detailedRecipe}
        isLoadingDetail={false}
        handleClose={vi.fn()}
        handleOpenEditModal={vi.fn()}
      />
    );

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('材料')).toBeInTheDocument();
    expect(screen.getByText('玉ねぎ 2個')).toBeInTheDocument();
    expect(screen.getByText('カレールー 1箱')).toBeInTheDocument();

    expect(screen.getByText('手順')).toBeInTheDocument();
    expect(screen.getByText('1. 玉ねぎを炒める')).toBeInTheDocument();
    expect(screen.getByText('2. 水を加えて煮込む')).toBeInTheDocument();

    // Step image check
    const stepImage = screen.getByAltText('Step 1 Image 1');
    expect(stepImage).toBeInTheDocument();
    expect(stepImage).toHaveAttribute('src', 'https://example.com/step1.jpg');
  });

  it('triggers handleOpenEditModal when edit button is clicked', () => {
    const handleOpenEditModal = vi.fn();
    const handleClose = vi.fn();
    render(
      <RecipeView
        recipe={detailedRecipe}
        isLoadingDetail={false}
        handleClose={handleClose}
        handleOpenEditModal={handleOpenEditModal}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenEditModal).toHaveBeenCalledWith(detailedRecipe);
  });
});
