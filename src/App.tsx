import React, { useMemo, useState } from 'react';
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
import CookieConsent from './components/CookieConsent';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className={`App ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            <header className="App-header">TokenForge</header>
            <NavBar />
            <ConnectPhantomButton />
            <HelpSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <div className="card">
              <TokenCreatorForm />
            </div>
            {/* Video tutorial */}
            <div className="video-tutorial">
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/AoDUqHX2UZg"
                title="TokenForge Tutorial"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <TrustSection />
            <Footer />
            <CookieConsent />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;