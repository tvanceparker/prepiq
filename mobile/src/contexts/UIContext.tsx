import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Portal, Snackbar } from 'react-native-paper';

type SnackbarState = { visible: boolean; message: string; type: 'info' | 'error' | 'success' };

interface UIContextType {
  showSnackbar: (message: string, type?: SnackbarState['type']) => void;
  hideSnackbar: () => void;
  setGlobalModal: (content: ReactNode | null) => void;
}

const UIContext = createContext<UIContextType>({
  showSnackbar: () => {},
  hideSnackbar: () => {},
  setGlobalModal: () => {},
});

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'info',
  });
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);

  const showSnackbar = (message: string, type: SnackbarState['type'] = 'info') =>
    setSnackbar({ visible: true, message, type });
  const hideSnackbar = () => setSnackbar(s => ({ ...s, visible: false }));
  const setGlobalModal = (content: ReactNode | null) => setModalContent(content);

  return (
    <UIContext.Provider value={{ showSnackbar, hideSnackbar, setGlobalModal }}>
      {children}
      <Portal>
        <Snackbar visible={snackbar.visible} onDismiss={hideSnackbar} duration={3000}>
          {snackbar.message}
        </Snackbar>
        {modalContent}
      </Portal>
    </UIContext.Provider>
  );
};
