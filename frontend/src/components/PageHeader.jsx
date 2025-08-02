import { Typography, Box } from "@mui/material";

export function PageHeader({ title }) {
  return (
    <Box
      sx={{
        mb: 3,
        borderBottom: "1px solid",
        borderColor: "divider",
        pb: 1,
      }}
    >
      <Typography
        variant="h3"
        component="h1"
        color="text.primary"
        fontWeight={600}
      >
        {title}
      </Typography>
    </Box>
  );
}
