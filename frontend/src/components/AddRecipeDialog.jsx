import React, { useRef } from 'react'; // Import useRef
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControlLabel, Checkbox, Box, Typography, IconButton, CircularProgress } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

function AddRecipeDialog({
  isModalOpen,
  handleCloseModal,
  newRecipeTitle,
  setNewRecipeTitle,
  newRecipeNotes,
  setNewRecipeNotes,
  newRecipeLink,
  setNewRecipeLink,
  newRecipeIngredients,
  setNewRecipeIngredients,
  newRecipeSteps,
  setNewRecipeSteps,
  newRecipeIsFavorite,
  setNewRecipeIsFavorite,
  handleAddRecipe,
  isEditing,
  resetFormStates,
  api, // Pass the api prop
}) {
  const fileInputRefs = useRef([]); // Ref for file inputs
  const [uploadingImageIndex, setUploadingImageIndex] = React.useState(null); // State to track uploading image

  const handleAdd = () => {
    handleAddRecipe();
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...newRecipeIngredients];
    newIngredients[index][field] = value;
    setNewRecipeIngredients(newIngredients);
  };

  const handleAddIngredient = () => {
    setNewRecipeIngredients([...newRecipeIngredients, { name: '', quantity: '' }]);
  };

  const handleRemoveIngredient = (index) => {
    const newIngredients = newRecipeIngredients.filter((_, i) => i !== index);
    setNewRecipeIngredients(newIngredients);
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...newRecipeSteps];
    newSteps[index].description = value;
    setNewRecipeSteps(newSteps);
  };

  const handleAddStep = () => {
    setNewRecipeSteps([...newRecipeSteps, { description: '', imageUrls: [] }]);
  };

  const handleRemoveStep = (index) => {
    const newSteps = newRecipeSteps.filter((_, i) => i !== index);
    setNewRecipeSteps(newSteps);
  };

  const handleImageUpload = async (stepIndex, file) => {
    if (!file) return;

    setUploadingImageIndex(stepIndex); // Set uploading state

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/api/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = response.data.imageUrl;
      const newSteps = [...newRecipeSteps];
      newSteps[stepIndex].imageUrls = [...(newSteps[stepIndex].imageUrls || []), imageUrl];
      setNewRecipeSteps(newSteps);

    } catch (error) {
      console.error('Error uploading image:', error);
      // Handle error (e.g., show a snackbar)
    } finally {
      setUploadingImageIndex(null); // Reset uploading state
    }
  };

  const handleRemoveImage = (stepIndex, imageIndex) => {
    const newSteps = [...newRecipeSteps];
    newSteps[stepIndex].imageUrls = newSteps[stepIndex].imageUrls.filter((_, i) => i !== imageIndex);
    setNewRecipeSteps(newSteps);
  };

  return (
    <Dialog open={isModalOpen} onClose={handleCloseModal} slotProps={{ transition: { onExited: resetFormStates } }} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'レシピを編集' : '新しいレシピを追加'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          label="タイトル"
          variant="outlined"
          fullWidth
          value={newRecipeTitle}
          onChange={(e) => setNewRecipeTitle(e.target.value)}
          sx={{ mb: 3, mt: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormControlLabel
          control={<Checkbox checked={newRecipeIsFavorite} onChange={(e) => setNewRecipeIsFavorite(e.target.checked)} />}
          label="お気に入り"
          sx={{ mb: 2 }}
        />
        <TextField
          label="メモ (オプション)"
          variant="outlined"
          fullWidth
          multiline
          rows={2}
          value={newRecipeNotes}
          onChange={(e) => setNewRecipeNotes(e.target.value)}
          sx={{ mb: 2}}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="レシピサイト (オプション)"
          variant="outlined"
          fullWidth
          value={newRecipeLink}
          onChange={(e) => setNewRecipeLink(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <Typography variant="h6" gutterBottom>材料</Typography>
        {newRecipeIngredients.map((ingredient, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              label="材料名"
              variant="outlined"
              value={ingredient.name}
              onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
              sx={{ mr: 1, flexGrow: 1 }}
            />
            <TextField
              label="分量"
              variant="outlined"
              value={ingredient.quantity}
              onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
              sx={{ mr: 1, width: '120px' }}
            />
            <IconButton onClick={() => handleRemoveIngredient(index)}>
              <RemoveCircleOutlineIcon />
            </IconButton>
          </Box>
        ))}
        <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddIngredient}>
          材料を追加
        </Button>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>手順</Typography>
        {newRecipeSteps.map((step, stepIndex) => (
          <Box key={stepIndex} sx={{ mb: 2, p: 1, border: '1px solid #ccc', borderRadius: '4px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TextField
                label={`手順 ${stepIndex + 1}`}
                variant="outlined"
                fullWidth
                value={step.description}
                onChange={(e) => handleStepChange(stepIndex, e.target.value)}
                sx={{ mr: 1 }}
              />
              <IconButton onClick={() => handleRemoveStep(stepIndex)}>
                <RemoveCircleOutlineIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {(step.imageUrls || []).map((imageUrl, imageIndex) => (
                <Box key={imageIndex} sx={{ position: 'relative', width: 100, height: 100, border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }}>
                  <img src={imageUrl} alt={`Step ${stepIndex + 1} Image ${imageIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.7)' }}
                    onClick={() => handleRemoveImage(stepIndex, imageIndex)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={(el) => (fileInputRefs.current[stepIndex] = el)}
                onChange={(e) => handleImageUpload(stepIndex, e.target.files[0])}
              />
              <Button
                variant="outlined"
                component="span"
                startIcon={uploadingImageIndex === stepIndex ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                onClick={() => fileInputRefs.current[stepIndex].click()}
                disabled={uploadingImageIndex === stepIndex}
                sx={{ width: 100, height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap' }}
              >
                {uploadingImageIndex === stepIndex ? 'アップロード中' : '画像追加'}
              </Button>
            </Box>
          </Box>
        ))}
        <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddStep}>
          手順を追加
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseModal}>キャンセル</Button>
        <Button variant="contained" onClick={handleAdd}>{isEditing ? '更新' : '追加'}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddRecipeDialog;
