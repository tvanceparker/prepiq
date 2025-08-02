import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Box,
  Autocomplete,
} from "@mui/material";

export default function MenuItemModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories = [],
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    is_active: true,
  });

  const [errors, setErrors] = useState({
    name: false,
    category: false,
    price: false,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          name: initialData.name || "",
          category: initialData.category || "",
          price:
            initialData.price !== undefined ? initialData.price.toString() : "",
          is_active: initialData.is_active ?? true,
        });
      } else {
        setForm({ name: "", category: "", price: "", is_active: true });
      }
      setErrors({ name: false, category: false, price: false });
    }
  }, [isOpen, initialData]);

  const validate = () => {
    const newErrors = {
      name: form.name.trim() === "",
      category: form.category.trim() === "",
      price: form.price.trim() === "" || isNaN(parseFloat(form.price)),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  // For Autocomplete change:
  const handleCategoryChange = (event, newValue) => {
    setForm((prev) => ({
      ...prev,
      category: newValue || "",
    }));
    setErrors((prev) => ({ ...prev, category: false }));
  };

  const handleSave = async () => {
    if (!validate()) return;

    const priceNum = parseFloat(form.price);
    await onSubmit({ ...form, price: priceNum });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {initialData ? "Edit Menu Item" : "Add Menu Item"}
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          noValidate
          autoComplete="off"
          sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            error={errors.name}
            helperText={errors.name && "Name is required"}
            fullWidth
          />

          <Autocomplete
            freeSolo
            options={categories}
            value={form.category}
            onChange={handleCategoryChange}
            onInputChange={(e, newInputValue) => {
              setForm((prev) => ({ ...prev, category: newInputValue }));
              setErrors((prev) => ({ ...prev, category: false }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Category"
                required
                error={errors.category}
                helperText={errors.category && "Category is required"}
                fullWidth
              />
            )}
          />

          <TextField
            label="Price"
            name="price"
            type="number"
            value={form.price}
            onChange={handleChange}
            required
            error={errors.price}
            helperText={errors.price && "Valid price is required"}
            inputProps={{
              step: "0.01",
              min: "0",
            }}
            fullWidth
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={form.is_active}
                onChange={handleChange}
                name="is_active"
              />
            }
            label="Active"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ pr: 3, pb: 2 }}>
        <Button onClick={onClose} color="secondary" variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={
            !form.name ||
            !form.category ||
            !form.price ||
            isNaN(parseFloat(form.price))
          }
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
