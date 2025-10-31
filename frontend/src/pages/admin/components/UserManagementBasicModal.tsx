import React, { useState, useEffect } from 'react';
import type {
  Employee,
  Role,
  UserManagementFormData,
  UserManagementFormErrors,
} from '../../../interfaces/admin';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
} from '@mui/material';

interface UserManagementBasicModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: UserManagementFormData) => Promise<void>;
  employee: Employee | null;
  roles: Role[];
  confirmDelete: boolean;
  setConfirmDelete: (value: boolean) => void;
}

export default function UserManagementBasicModal({
  visible,
  onClose,
  onSave,
  employee,
  roles,
  confirmDelete,
  setConfirmDelete,
}: UserManagementBasicModalProps) {
  const [formData, setFormData] = useState<UserManagementFormData>({
    name: '',
    email: '',
    username: '',
    phone: '',
    role_id: '',
    is_active: true,
    pay_rate: '',
    employment_type: 'hourly',
    password: '',
  });

  const [errors, setErrors] = useState<UserManagementFormErrors>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        username: employee.username || '',
        phone: employee.phone || '',
        role_id: employee.role_id || (roles[0] ? roles[0].role_id : ''),
        is_active: employee.is_active,
        pay_rate: (employee as any).pay_rate || '',
        employment_type: (employee as any).employment_type || 'hourly',
        password: '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        username: '',
        phone: '',
        role_id: roles.length ? roles[0].role_id : '',
        is_active: true,
        pay_rate: '',
        employment_type: 'hourly',
        password: '',
      });
    }
    setErrors({});
  }, [employee, roles]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    const parts = [];
    if (digits.length > 0) parts.push('(' + digits.slice(0, 3));
    if (digits.length >= 4) parts.push(') ' + digits.slice(3, 6));
    if (digits.length >= 7) parts.push('-' + digits.slice(6));
    return parts.join('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'phone') {
      newValue = formatPhone(value);
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = () => {
    const newErrors: UserManagementFormErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!validateEmail(formData.email)) newErrors.email = 'Invalid email';
    if (formData.phone.replace(/\D/g, '').length !== 10)
      newErrors.phone = 'Phone must be 10 digits';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={visible} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{employee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              autoFocus
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              fullWidth
              error={!!errors.username}
              helperText={errors.username}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              fullWidth
              error={!!errors.phone}
              helperText={errors.phone}
              inputProps={{ maxLength: 14 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Pay Rate"
              type="number"
              inputProps={{ step: '0.01' }}
              name="pay_rate"
              value={formData.pay_rate}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="employment-type-label">Employment Type</InputLabel>
              <Select
                labelId="employment-type-label"
                name="employment_type"
                value={formData.employment_type}
                label="Employment Type"
                onChange={handleChange}
              >
                <MenuItem value="hourly">Hourly</MenuItem>
                <MenuItem value="salary">Salary</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                name="role_id"
                value={formData.role_id}
                label="Role"
                onChange={handleChange}
              >
                {roles.map(role => (
                  <MenuItem key={role.role_id} value={role.role_id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={employee ? '(Leave blank to keep)' : ''}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {confirmDelete && (
          <Button variant="outlined" color="error" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
