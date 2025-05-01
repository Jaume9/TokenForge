import React, { useMemo } from 'react';
import './App.css';
import ConnectPhantomButton from './components/ConnectPhantomButton';
import TokenCreatorForm from './components/TokenCreatorForm';
import NavBar from './components/NavBar';
import HelpSidebar from './components/HelpSidebar';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

import TrustSection from './components/TrustSection';
import Footer from './components/Footer';

function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <header className="App-header">TokenForge</header>
            <NavBar />
            <ConnectPhantomButton />
            <div className="card">
              <TokenCreatorForm />
            </div>
            <HelpSidebar />
            <TrustSection />
            <Footer />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;