import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button, Box, List, ListItem, ListItemText, Divider, Link } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import Linkify from 'react-linkify';

const RecipeView = ({ recipe, handleClose, handleOpenEditModal, componentDecorator }) => {
  if (!recipe) return null;

  return (
    <Dialog open={!!recipe} onClose={handleClose} fullScreen>
      <DialogTitle>
        {recipe.title}
        <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              handleClose();
              handleOpenEditModal(recipe);
            }}
          >
            編集
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {recipe.notes && (
          <Typography variant="body1" paragraph>
            <Linkify componentDecorator={componentDecorator}>{recipe.notes}</Linkify>
          </Typography>
        )}
        {recipe.link && (
          <Typography variant="body1" paragraph>
            参考: <Link href={recipe.link} target="_blank" rel="noopener noreferrer">{recipe.link}</Link>
          </Typography>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          材料
        </Typography>
        <List>
          {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
            <ListItem key={index}>
              <ListItemText primary={`${ingredient.name} ${ingredient.quantity}`} />
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          手順
        </Typography>
        <List>
          {recipe.steps && recipe.steps.map((step, index) => (
            <ListItem key={index} sx={{ display: 'block' }}>
              <ListItemText primary={`${index + 1}. ${step.description}`} />
              {step.imageUrls && step.imageUrls.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {step.imageUrls.map((url, imgIndex) => (
                    <Box key={imgIndex} sx={{ width: 150, height: 150, border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={url} alt={`Step ${index + 1} Image ${imgIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  ))}
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecipeView;
