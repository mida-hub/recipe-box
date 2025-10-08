import { Typography, Grid, Card, CardContent, CardActions, IconButton, Link } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Linkify from 'react-linkify';

const RecipeList = ({ title, recipes, handleToggleFavorite, handleDeleteRecipe, handleOpenModal, componentDecorator }) => {
  return (
    <>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
        {title}
      </Typography>
      <Grid container spacing={2}>
        {recipes.map(recipe => (
          <Grid item xs={12} sm={6} md={4} key={recipe.id}>
            <Card
              sx={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}
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
                <IconButton aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default RecipeList;
