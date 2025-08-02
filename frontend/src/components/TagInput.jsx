import React, { useState } from "react";
import Tag from "./Tag";
import { Box, InputBase, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function TagInput({ value = [], onChange, placeholder = "" }) {
  const [inputValue, setInputValue] = useState("");

  // Add tags splitting by comma, semicolon, space
  const addTags = (input) => {
    const newTags = input
      .split(/[,;\s]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0 && !value.includes(tag));

    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
    }
  };

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleKeyDown = (e) => {
    if (["Enter", ",", ";", " "].includes(e.key)) {
      e.preventDefault();
      addTags(inputValue);
      setInputValue("");
    } else if (e.key === "Backspace" && inputValue === "") {
      // Remove last tag if input empty
      onChange(value.slice(0, value.length - 1));
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1,
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        bgcolor: "background.paper",
      }}
    >
      {value.map((tag) => (
        <Tag
          key={tag}
          color="primary"
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        >
          {tag}
          <IconButton
            size="small"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
            sx={{
              color: "inherit",
              padding: 0,
              "&:hover": {
                color: "error.main",
              },
              lineHeight: 1,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tag>
      ))}

      <InputBase
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        sx={{
          flexGrow: 1,
          minWidth: 120,
          p: 0.5,
          color: "text.primary",
          "& .MuiInputBase-input": {
            px: 1,
          },
        }}
        inputProps={{ "aria-label": "add tag" }}
      />
    </Box>
  );
}
