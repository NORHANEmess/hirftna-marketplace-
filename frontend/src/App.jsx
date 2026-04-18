import { AuthProvider } from './context/AuthContext';
import AppRouter from './router/index';

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;