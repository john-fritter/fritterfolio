import App from "./App.jsx";
import { ThemeProvider } from './hooks/theme';

export default function Root() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
