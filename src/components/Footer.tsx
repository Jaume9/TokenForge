import React from 'react';
import './styles.css';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <p>
        TokenForge is a token creation platform that allows users to generate Solana-based tokens instantly, with no coding required. TokenForge does not issue, endorse, manage, or provide liquidity for any tokens created using our service. We do not provide financial advice, investment recommendations, or guarantees of value, price, or returns on any tokens. Tokens created on TokenForge are not securities, and users are solely responsible for ensuring compliance with applicable laws and regulations in their jurisdiction. TokenForge does not facilitate token trading, fundraising, or liquidity provision. By using TokenForge, you acknowledge that creating and trading tokens carry significant risks, including loss of funds, market volatility, and regulatory uncertainty. TokenForge is provided "as is" without warranties of any kind. We are not responsible for any outcomes related to the use of our platform. By using TokenForge, you accept full responsibility for your actions and any consequences that may arise. Always conduct your own due diligence before engaging with any token or project.
      </p>
      <p>© 2025 TokenForge | All Rights Reserved | Support on <a href="https://x.com/TokenForgeNow" target="_blank" rel="noopener noreferrer">Twitter/X</a></p>
    </footer>
  );
};

export default Footer;