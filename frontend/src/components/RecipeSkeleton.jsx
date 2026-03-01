import { Box, Card, CardContent, CardActions, Skeleton, Typography } from '@mui/material';

const RecipeSkeleton = () => {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Box key={i} sx={{ flexBasis: { xs: 'calc(50% - 8px)', sm: 'calc(33.33% - 11px)', md: 'calc(25% - 12px)' } }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 1 }} width="80%" />
              <Skeleton variant="rectangular" height={40} />
            </CardContent>
            <CardActions>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="circular" width={40} height={40} />
            </CardActions>
          </Card>
        </Box>
      ))}
    </Box>
  );
};

export default RecipeSkeleton;
