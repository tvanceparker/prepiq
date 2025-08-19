import React, { createContext, useContext, useState, ReactNode } from 'react';

type AppState = {
  token: string | null;
  setToken: (t: string | null) => void;
};

const defaultState: AppState = { token: null, setToken: () => {} };
const AppContext = createContext<AppState>(defaultState);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  return <AppContext.Provider value={{ token, setToken }}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
