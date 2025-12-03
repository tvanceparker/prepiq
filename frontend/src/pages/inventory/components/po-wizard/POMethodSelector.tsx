import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Typography,
  Chip,
  Stack,
  Fade,
  alpha,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export type WizardMode = 'supplier' | 'ingredient';

interface POMethodSelectorProps {
  selectedMode: WizardMode | null;
  onSelectMode: (mode: WizardMode) => void;
}

export default function POMethodSelector({ selectedMode, onSelectMode }: POMethodSelectorProps) {
  return (
    <Fade in timeout={300}>
      <Box>
        <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
          How would you like to order?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          Choose based on your needs
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                border: 2,
                borderColor: selectedMode === 'supplier' ? 'primary.main' : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.light',
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => onSelectMode('supplier')}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: alpha('#2196f3', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <LocalShippingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    By Supplier
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    AI-powered suggestions based on forecasted demand. Groups orders by supplier for
                    efficient bulk ordering.
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                    <Chip
                      icon={<AutoAwesomeIcon />}
                      label="AI Suggested"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      icon={<TrendingUpIcon />}
                      label="Forecast-based"
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                border: 2,
                borderColor: selectedMode === 'ingredient' ? 'secondary.main' : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'secondary.light',
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => onSelectMode('ingredient')}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: alpha('#9c27b0', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <InventoryIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    By Ingredient
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Browse all ingredients by stock level. See which items need attention and
                    compare supplier prices.
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                    <Chip
                      icon={<WarningIcon />}
                      label="Stock Levels"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                    <Chip
                      icon={<ShoppingCartIcon />}
                      label="Compare Prices"
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );
}
