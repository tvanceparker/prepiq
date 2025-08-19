import React, { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import BasicAccountSettingsModal from "./BasicAccountSettingsModal";
import { useAccountSettings } from "../hooks/useAccountSettings";
import { useUIStore } from "../../../stores/uiStore";

export default function BasicAccountSettings(): JSX.Element | null {
  const {
    accountInfo,
    loadingAccountInfo,
    errorAccountInfo,
    updateLoading,
    updateError,
    savePreferences,
    updateUserEmail,
    updateUserPhone,
    changeUserPassword,
  } = useAccountSettings();

  const [modalType, setModalType] = useState<string | null>(null);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  if (loadingAccountInfo) {
    return (
      <Typography variant="body1" align="center" sx={{ mt: 4 }}>
        Loading...
      </Typography>
    );
  }

  if (errorAccountInfo) {
    return (
      <Typography variant="body1" color="error" align="center" sx={{ mt: 4 }} role="alert">
        {(errorAccountInfo as any).message || "Error"}
      </Typography>
    );
  }

  if (!accountInfo) return null;

  const LabeledValue = ({ label, value, buttonLabel, onButtonClick }: { label: string; value?: React.ReactNode; buttonLabel?: string; onButtonClick?: () => void }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ mb: onButtonClick ? 1 : 0 }}>
        {value}
      </Typography>
      {onButtonClick && (
        <Button size="small" variant="contained" onClick={onButtonClick}>
          {buttonLabel}
        </Button>
      )}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5">Account</Typography>
      <LabeledValue label="Name" value={accountInfo.name} />
      <LabeledValue label="Role" value={accountInfo.role ?? "-"} />
      <LabeledValue label="Email" value={accountInfo.email} buttonLabel="Edit" onButtonClick={() => openModal('email')} />
      <LabeledValue label="Phone" value={accountInfo.phone ?? "-"} buttonLabel="Edit" onButtonClick={() => openModal('phone')} />
      <LabeledValue label="Restaurant" value={accountInfo.restaurant_name ?? "-"} />
      <LabeledValue label="Restaurant location" value={accountInfo.restaurant_latitude ? `${accountInfo.restaurant_latitude}, ${accountInfo.restaurant_longitude}` : 'Not set'} />

      <BasicAccountSettingsModal
        type={modalType}
        onClose={closeModal}
        savePreferences={savePreferences}
        updateUserEmail={updateUserEmail}
        updateUserPhone={updateUserPhone}
        changeUserPassword={changeUserPassword}
        loading={updateLoading}
        error={updateError}
        currentPreferences={accountInfo.preferences}
        currentEmail={accountInfo.email}
        currentPhone={accountInfo.phone}
        onShowSnackbar={showSnackbar}
      />
    </Box>
  );
}
