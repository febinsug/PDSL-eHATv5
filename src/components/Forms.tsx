import { Box } from '@mui/material';

// ... existing code ...

<Box
  sx={{
    width: { xs: '100%', sm: '80%', md: '60%' },
    margin: '0 auto',
    '& .MuiTextField-root': {
      width: '100%',
      marginBottom: 2
    }
  }}
>
  {/* Form components */}
</Box>

// ... existing code ...