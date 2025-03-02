import { createContext, useContext } from 'react';

export const ThemeContext = createContext({
  mode: 'auto',
  cycleMode: () => {},
});

export const useTheme = () => useContext(ThemeContext); 