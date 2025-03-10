import App from "./App.jsx";
import { ThemeProvider } from './context/ThemeProvider';

export default function Root() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
