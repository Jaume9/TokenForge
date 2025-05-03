import React from 'react';
import './styles.css';

interface HelpSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const HelpSidebar: React.FC<HelpSidebarProps> = ({ isOpen, toggleSidebar }) => {
  return (
    <div className={`help-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="help-header" onClick={toggleSidebar}>
        <h3 className="help-title">How It Works</h3>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <div className="help-content">
          <div className="steps-container">
            <ol className="steps-list">
              <li>Connect your Solana wallet</li>
              <li>Write the name you want for your Token</li>
              <li>Choose a symbol (max 8 characters)</li>
              <li>Upload an image for your token (JPG/PNG, max 5MB)</li>
              <li>Select decimals (9 is standard for meme tokens)</li>
              <li>Enter the total supply</li>
              <li>Write a description for your token</li>
              <li>Fill in optional social links</li>
              <li>Choose security options (revoke authorities)</li>
              <li>Click Create and confirm the transaction</li>
            </ol>
          </div>

          <div className="info-card">
            <h4>Token Creation Costs</h4>
            <p>Base cost: <strong>0.1 SOL</strong></p>
            <p>Additional options:</p>
            <ul>
              <li>Revoke Mint Authority: <strong>+0.08 SOL</strong></li>
              <li>Revoke Freeze Authority: <strong>+0.08 SOL</strong></li>
              <li>Revoke Update Authority: <strong>+0.08 SOL</strong></li>
              <li>Custom Creator Info: <strong>+0.1 SOL</strong></li>
            </ul>
          </div>

          <div className="info-card">
            <h4>After Creating Your Token</h4>
            <p>Once your token is created:</p>
            <ol>
              <li>The total supply will be sent to your wallet</li>
              <li>You'll receive the token address and metadata details</li>
              <li>Your token will be ready to trade or add to liquidity pools</li>
            </ol>
          </div>

          <div className="info-card">
            <h4>Creating Liquidity Pool</h4>
            <p>Add liquidity on Raydium to make your token tradable:</p>
            <ol>
              <li>Click on "Create Liquidity" in navigation</li>
              <li>Connect your wallet on Raydium</li>
              <li>Select your token and a pairing token (SOL/USDC)</li>
              <li>Set initial liquidity amount and price</li>
              <li>Confirm transaction to create the pool</li>
            </ol>
            <p className="note-text">Note: Providing liquidity requires both your token and the pairing token.</p>
          </div>

          <div className="info-card">
            <h4>Managing Your Liquidity</h4>
            <p>To manage your token's liquidity:</p>
            <ol>
              <li>Click on "Manage Liquidity" in navigation</li>
              <li>Connect your wallet on Raydium's Portfolio page</li>
              <li>View your active liquidity positions</li>
              <li>Add more liquidity or remove as needed</li>
              <li>Monitor your token's trading performance</li>
            </ol>
          </div>

          <div className="info-card security-tips">
            <h4>Security Tips</h4>
            <ul>
              <li>Revoking authorities is recommended for community trust</li>
              <li>Keep a secure backup of your wallet</li>
              <li>Verify all transaction details before signing</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSidebar;