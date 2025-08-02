# React + TypeScript Form Handling & Validation Cheat Sheet (No Extra Libraries)

---

## Basic Setup: Controlled Form with useState

```tsx
import React, { useState } from "react";

interface RecipeFormData {
  name: string;
  description: string;
  // Add other fields as needed
}

const defaultFormData: RecipeFormData = {
  name: "",
  description: "",
};

export const RecipeForm: React.FC = () => {
  const [formData, setFormData] = useState<RecipeFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof RecipeFormData, string>>>({});

  // Update form state on input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Simple validation function
  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (formData.name.length > 100) newErrors.name = "Name must be under 100 characters";
    // Add more validation rules here...
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Example: just log data or send with fetch/axios (no axios here)
    console.log("Submitting form data:", formData);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="name">Recipe Name</label><br />
        <input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          aria-invalid={!!errors.name}
          aria-describedby="name-error"
          required
          maxLength={100}
        />
        {errors.name && <div id="name-error" style={{ color: "red" }}>{errors.name}</div>}
      </div>

      <div>
        <label htmlFor="description">Description</label><br />
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <button type="submit">Create Recipe</button>
    </form>
  );
};

interface Ingredient {
  name: string;
  quantity: string;
}

const [ingredients, setIngredients] = useState<Ingredient[]>([]);

const addIngredient = () => {
  setIngredients(prev => [...prev, { name: "", quantity: "" }]);
};

const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
  setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
};


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validate()) return;

  try {
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error("Failed to submit");

    alert("Recipe created!");
    setFormData(defaultFormData); // reset form
  } catch (error) {
    alert(error.message);
  }
};

<button type="button" onClick={() => setFormData(defaultFormData)}>Reset</button>
```