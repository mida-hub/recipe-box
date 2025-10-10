import { useState } from 'react';
import { Container, Typography, Box, AppBar, Snackbar, Alert, Toolbar, Fab, Button, TextField, InputAdornment, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AddRecipeDialog from './AddRecipeDialog';
import RecipeList from './RecipeList';
import RecipeView from './RecipeView'; // Import the new component
import LoadingSpinner from './LoadingSpinner';

const MainAppContent = ({ recipes, api, fetchRecipes, handleLogout }) => {
  // State for Add/Edit dialog
  const [newRecipeTitle, setNewRecipeTitle] = useState('');
  const [newRecipeNotes, setNewRecipeNotes] = useState('');
  const [newRecipeLink, setNewRecipeLink] = useState('');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState([]);
  const [newRecipeSteps, setNewRecipeSteps] = useState([]);
  const [newRecipeIsFavorite, setNewRecipeIsFavorite] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [viewingRecipe, setViewingRecipe] = useState(null); // State for view dialog

  const componentDecorator = (href, text, key) => (
    <a href={href} key={key} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
      {text}
    </a>
  );

  const handleOpenEditModal = (recipe = null) => {
    setIsEditModalOpen(true);
    if (recipe) {
      setEditingRecipe(recipe);
      setNewRecipeTitle(recipe.title);
      setNewRecipeNotes(recipe.notes || '');
      setNewRecipeLink(recipe.link || '');
      setNewRecipeIngredients(recipe.ingredients || []);
      setNewRecipeSteps(recipe.steps || []);
      setNewRecipeIsFavorite(recipe.isFavorite || false);
    } else {
      resetFormStates();
    }
  };

  const resetFormStates = () => {
    setEditingRecipe(null);
    setNewRecipeTitle('');
    setNewRecipeNotes('');
    setNewRecipeLink('');
    setNewRecipeIngredients([]);
    setNewRecipeSteps([]);
    setNewRecipeIsFavorite(false);
  }

  const handleOpenAddModal = () => {
    handleOpenEditModal(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleViewRecipe = (recipe) => {
    setViewingRecipe(recipe);
  };

  const handleCloseView = () => {
    setViewingRecipe(null);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // 新規レシピ作成または更新
  const handleAddOrUpdateRecipe = () => {
    if (!newRecipeTitle) return;

    const recipeData = {
      title: newRecipeTitle,
      notes: newRecipeNotes,
      link: newRecipeLink,
      ingredients: newRecipeIngredients,
      steps: newRecipeSteps,
      isFavorite: newRecipeIsFavorite,
    };

    const request = editingRecipe
      ? api.put(`/api/recipes/${editingRecipe.id}`, recipeData)
      : api.post('/api/recipes', recipeData);

    request
      .then(() => {
        fetchRecipes(); // Refresh recipes
        setSnackbarMessage(editingRecipe ? 'レシピを更新しました！' : 'レシピを追加しました！');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        handleCloseEditModal();
      })
      .catch(error => {
        console.error(editingRecipe ? 'Error updating recipe:' : 'Error adding recipe:', error);
        setSnackbarMessage(editingRecipe ? 'レシピの更新に失敗しました。' : 'レシピの追加に失敗しました。');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
  };

  // お気に入り状態を切り替え
  const handleToggleFavorite = (recipe) => {
    const updatedRecipe = { ...recipe, isFavorite: !recipe.isFavorite };
    api.put(`/api/recipes/${recipe.id}`, updatedRecipe)
      .then(() => {
        fetchRecipes(); // Refresh recipes
        setSnackbarMessage('お気に入りを更新しました！');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      })
      .catch(error => {
        console.error('Error updating recipe:', error);
        setSnackbarMessage('お気に入りの更新に失敗しました。');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
  };

  // レシピ削除
  const handleDeleteRecipe = (recipeId) => {
    api.delete(`/api/recipes/${recipeId}`)
      .then(() => {
        fetchRecipes(); // Refresh recipes
        setSnackbarMessage('レシピを削除しました！');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      })
      .catch(error => {
        console.error('Error deleting recipe:', error);
        setSnackbarMessage('レシピの削除に失敗しました。');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
  };

  const filteredRecipes = recipes
    .filter(recipe => recipe.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.title.localeCompare(b.title, 'ja');
    });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        width: '100vw',
        minHeight: '100vh',
        bgcolor: '#f0f2f5',
      }}
    >
      <LoadingSpinner />
      <AppBar position="static" color="primary" sx={{ mb: 2 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" sx={{ cursor: 'pointer' }} onClick={fetchRecipes}>
            レシピメモ
          </Typography>
          <Button color="inherit" onClick={handleLogout}>ログアウト</Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ width: { xs: '95%', sm: '80%', md: '60%' }, mt: 0 }}>

        <Box sx={{ my: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="レシピを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                '&:hover': {
                  backgroundColor: 'white',
                },
                '&.Mui-focused': {
                  backgroundColor: 'white',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <AddRecipeDialog
          isModalOpen={isEditModalOpen}
          handleCloseModal={handleCloseEditModal}
          newRecipeTitle={newRecipeTitle}
          setNewRecipeTitle={setNewRecipeTitle}
          newRecipeNotes={newRecipeNotes}
          setNewRecipeNotes={setNewRecipeNotes}
          newRecipeLink={newRecipeLink}
          setNewRecipeLink={setNewRecipeLink}
          newRecipeIngredients={newRecipeIngredients}
          setNewRecipeIngredients={setNewRecipeIngredients}
          newRecipeSteps={newRecipeSteps}
          setNewRecipeSteps={setNewRecipeSteps}
          newRecipeIsFavorite={newRecipeIsFavorite}
          setNewRecipeIsFavorite={setNewRecipeIsFavorite}
          handleAddRecipe={handleAddOrUpdateRecipe}
          isEditing={!!editingRecipe}
          resetFormStates={resetFormStates}
          api={api} // Pass the api prop
        />

        <RecipeView
          recipe={viewingRecipe}
          handleClose={handleCloseView}
          handleOpenEditModal={handleOpenEditModal}
          componentDecorator={componentDecorator}
        />

        <Fab color="primary" aria-label="add" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={handleOpenAddModal}>
          <AddIcon />
        </Fab>

        <RecipeList
          title="レシピ一覧"
          recipes={filteredRecipes}
          handleToggleFavorite={handleToggleFavorite}
          handleDeleteRecipe={handleDeleteRecipe}
          handleOpenModal={handleViewRecipe} // Changed to handleViewRecipe
          componentDecorator={componentDecorator}
        />
      </Container>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MainAppContent;
