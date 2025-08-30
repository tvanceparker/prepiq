// src/pages/pos/components/MenuItemGrid.tsx
import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { MenuItem } from '../../../interfaces/orders';

interface MenuItemGridProps {
  menuItems: MenuItem[];
  onAddItem: (item: MenuItem) => void;
  loading?: boolean;
}

const MenuItemGrid: React.FC<MenuItemGridProps> = ({ menuItems, onAddItem, loading }) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (menuItems.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          No menu items available. Add items in the Menu section to start selling.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {menuItems
        .filter(item => (typeof item.is_active === 'boolean' ? item.is_active : true))
        .map(item => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.menu_item_id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {item.name}
                </Typography>

                {item.category && (
                  <Chip label={item.category} size="small" variant="outlined" sx={{ mb: 1 }} />
                )}

                <Typography variant="h5" color="primary" fontWeight="bold">
                  ${item.price.toFixed(2)}
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => onAddItem(item)}
                >
                  Add to Order
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
    </Grid>
  );
};

export default MenuItemGrid;
