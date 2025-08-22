import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '../../../components/Button';
import { MenuItemDTO } from '../../../interfaces/dashboardInterfaceFrontend';

interface Props {
  items: MenuItemDTO[];
  onEdit?: (m: MenuItemDTO) => void;
  onDelete?: (id: number) => void;
  onToggleActive?: (m: MenuItemDTO) => void;
}

export default function MenuItemTable({ items = [], onEdit, onDelete, onToggleActive }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Price</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map(it => (
            <TableRow key={it.menu_item_id ?? it.name} hover>
              <TableCell>{it.name}</TableCell>
              <TableCell>{it.category}</TableCell>
              <TableCell>${it.price?.toFixed?.(2) ?? it.price}</TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => onEdit && onEdit(it)}>
                  Edit
                </Button>
                <Button
                  size="small"
                  onClick={() => onToggleActive && onToggleActive(it)}
                  sx={{ ml: 1 }}
                >
                  {it.is_active ? 'Deactivate' : 'Reactivate'}
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => onDelete && it.menu_item_id && onDelete(it.menu_item_id)}
                  sx={{ ml: 1 }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
