import { alpha } from '@mui/material/styles';
import { Box, Paper, Stack, Typography } from '@mui/material';
import type { PageHeaderProps } from '../interfaces/ui';

export function PageHeader({
  title,
  eyebrow,
  description,
  icon,
  actions,
  compact = false,
  sx,
}: PageHeaderProps): JSX.Element {
  if (compact) {
    return (
      <Box sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider', pb: 1, ...sx }}>
        {eyebrow && (
          <Typography variant="overline" color="text.secondary">
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h3" component="h1" color="text.primary" fontWeight={600}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
            {description}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Paper
      sx={theme => ({
        mb: 3,
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 4,
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.12),
        background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.16)} 0%, ${alpha(
          theme.palette.success.light,
          0.12
        )} 52%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
        boxShadow: '0 22px 54px rgba(15, 23, 42, 0.08)',
        ...sx,
      })}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ width: '100%' }}>
          {icon && (
            <Box
              sx={theme => ({
                width: 52,
                height: 52,
                flexShrink: 0,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                backgroundColor: alpha(theme.palette.background.paper, 0.7),
                color: theme.palette.primary.main,
              })}
            >
              {icon}
            </Box>
          )}

          <Box>
            {eyebrow && (
              <Typography variant="overline" color="text.secondary">
                {eyebrow}
              </Typography>
            )}
            <Typography
              variant="h4"
              component="h1"
              color="text.primary"
              fontWeight={800}
              sx={{ letterSpacing: '-0.03em' }}
            >
              {title}
            </Typography>
            {description && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                {description}
              </Typography>
            )}
          </Box>
        </Stack>

        {actions && <Box sx={{ width: { xs: '100%', md: 'auto' } }}>{actions}</Box>}
      </Stack>
    </Paper>
  );
}
