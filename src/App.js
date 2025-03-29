import './App.css';
import Home from './pages/home';
import { WidgetApiProvider } from "@matrix-widget-toolkit/react";
import MatrixClientProvider from './components/MatrixClientProvider'; // Import the MatrixClientProvider

function App() {

  return (
    <MatrixClientProvider> {/* Wrap Home with MatrixClientProvider */}
      <h1 className="text-2xl font-bold text-center my-4">NFT Marketplace</h1>
      <Home />
    </MatrixClientProvider>
  );
}

export default App;