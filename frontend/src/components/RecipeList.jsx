import React, { useState } from 'react';
import { Typography, Box, Card, CardContent, CardActions, IconButton, Link, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Linkify from 'react-linkify';

const RecipeList = ({ title, recipes, handleToggleFavorite, handleDeleteRecipe, handleOpenModal, componentDecorator }) => {
  const [open, setOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);

  const handleClickOpen = (e, recipeId) => {
    e.stopPropagation();
    setSelectedRecipeId(recipeId);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedRecipeId(null);
  };

  const handleConfirmDelete = () => {
    if (selectedRecipeId) {
      handleDeleteRecipe(selectedRecipeId);
    }
    handleClose();
  };

  return (
    <>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {recipes.map(recipe => (
          <Box key={recipe.id} sx={{ flexBasis: { xs: 'calc(50% - 8px)', sm: 'calc(33.33% - 11px)', md: 'calc(25% - 12px)' } }}>
            <Card
              sx={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}
              onClick={() => handleOpenModal(recipe)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="div">
                  {recipe.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {recipe.notes && <Linkify componentDecorator={componentDecorator}>{recipe.notes}</Linkify>}
                </Typography>
                {recipe.link && (
                  <Link href={recipe.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    参考
                  </Link>
                )}
              </CardContent>
              <CardActions disableSpacing>
                <IconButton aria-label="add to favorites" onClick={(e) => { e.stopPropagation(); handleToggleFavorite(recipe); }}>
                  {recipe.isFavorite ? <StarIcon color="primary" /> : <StarBorderIcon />}
                </IconButton>
                <IconButton aria-label="delete" onClick={(e) => handleClickOpen(e, recipe.id)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"レシピを削除しますか？"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            この操作は取り消せません。本当に削除してもよろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>キャンセル</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RecipeList;
