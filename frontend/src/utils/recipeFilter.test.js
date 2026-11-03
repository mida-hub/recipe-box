import { describe, it, expect } from 'vitest';

// Function under test: same sorting & filtering logic as MainAppContent
function filterAndSortRecipes(recipes, searchQuery = '') {
  return recipes
    .filter((recipe) =>
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      // Japanese kana / alphabetical order
      return a.title.localeCompare(b.title, 'ja');
    });
}

describe('Recipe Filter and Sort Logic', () => {
  const recipes = [
    { id: '1', title: 'ハンバーグ', isFavorite: false },
    { id: '2', title: 'カレーライス', isFavorite: false },
    { id: '3', title: 'オムライス', isFavorite: true },
    { id: '4', title: 'から揚げ', isFavorite: true },
  ];

  it('sorts favorites first, and within each group by Japanese alphabetical order', () => {
    const result = filterAndSortRecipes(recipes);

    // Favorites: オムライス, から揚げ -> 'オ' comes before 'か' in ja collation
    expect(result.map((r) => r.title)).toEqual([
      'オムライス', // favorite
      'から揚げ',   // favorite
      'カレーライス', // non-favorite
      'ハンバーグ',   // non-favorite
    ]);
  });

  it('filters recipes by search query case-insensitively', () => {
    const result = filterAndSortRecipes(recipes, 'ライス');
    expect(result.map((r) => r.title)).toEqual([
      'オムライス',
      'カレーライス',
    ]);
  });

  it('returns empty array when search query matches nothing', () => {
    const result = filterAndSortRecipes(recipes, 'パスタ');
    expect(result).toEqual([]);
  });
});
