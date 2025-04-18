import './styles.css';
import { useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

const ConnectPhantomButton = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const network = WalletAdapterNetwork.Mainnet;
  const connection = new Connection(clusterApiUrl(network));

  // Verificar si la wallet está conectada al cargar el componente
  useEffect(() => {
    const checkConnection = async () => {
      if (window.solana && window.solana.isConnected) {
        setIsConnected(true);
        setPublicKey(new PublicKey(window.solana.publicKey));
      }
    };
    checkConnection();
  }, []);

  // Manejar la conexión
  const handleConnect = async () => {
    try {
      if (!window.solana || !window.solana.isPhantom) {
        alert('¡Phantom Wallet no está instalado!');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const wallet = new PhantomWalletAdapter();
      await wallet.connect();

      if (wallet.connected && wallet.publicKey) {
        setIsConnected(true);
        setPublicKey(wallet.publicKey);
        console.log('Wallet conectada:', wallet.publicKey.toString());
      }
    } catch (error) {
      console.error('Error al conectar la wallet:', error);
    }
  };

  // Manejar la desconexión
  const handleDisconnect = async () => {
    try {
      const wallet = new PhantomWalletAdapter();
      await wallet.disconnect();
      setIsConnected(false);
      setPublicKey(null);
    } catch (error) {
      console.error('Error al desconectar:', error);
    }
  };

  return (
    <div className="wallet-container">
      {isConnected ? (
        <div className="connected-info">
          <span className="public-key">
            Conectado: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
          <button onClick={handleDisconnect} className="disconnect-button">
            Desconectar
          </button>
        </div>
      ) : (
        <button onClick={handleConnect} className="connect-button">
          <img 
            src="https://phantom.app/img/phantom-logo.svg" 
            alt="Phantom Logo" 
            className="phantom-logo"
          />
          Conectar Phantom Wallet
        </button>
      )}
    </div>
  );
};

export default ConnectPhantomButton;