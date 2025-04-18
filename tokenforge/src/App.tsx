import React, { useMemo } from 'react';
import './App.css';
import ConnectPhantomButton from './components/ConnectPhantomButton';
import TokenCreatorForm from './components/TokenCreatorForm';

// Añadimos los imports necesarios para el proveedor de wallet
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Importamos los estilos por defecto del wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  // Configuramos la conexión y los wallets que queremos soportar
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <header className="App-header">
              <h1>TokenForge</h1>
              <ConnectPhantomButton />
            </header>
            <main>
              <TokenCreatorForm />
            </main>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;