import React from 'react';
import './styles.css';

const NavBar: React.FC = () => {
  return (
    <div className="nav-bar">
      <div className="nav-links">
        <a 
          href="https://raydium.io/liquidity/create-pool/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="nav-link"
        >
          <span className="nav-icon">🔄</span>
          Create Liquidity
        </a>
        <a 
          href="https://raydium.io/portfolio/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="nav-link"
        >
          <span className="nav-icon">📊</span>
          Manage Liquidity
        </a>
      </div>
    </div>
  );
};

export default NavBar;