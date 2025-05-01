import React from 'react';
import './styles.css';

const TrustSection: React.FC = () => {
  return (
    <div className="trust-section">
      <h2>Why Choose TokenForge?</h2>
      <div className="trust-cards">
        <div className="trust-card">
          <h3>Secure and Reliable</h3>
          <p>
            Built on the Solana blockchain, TokenForge ensures fast, secure, and reliable token creation with minimal fees.
          </p>
        </div>
        <div className="trust-card">
          <h3>Easy to Use</h3>
          <p>
            Our intuitive interface makes it simple for anyone to create their own token in just a few steps.
          </p>
        </div>
        <div className="trust-card">
          <h3>Transparent Costs</h3>
          <p>
            No hidden fees. You only pay for the features you choose, with clear pricing displayed upfront.
          </p>
        </div>
        <div className="trust-card">
          <h3>Community Trust</h3>
          <p>
            By revoking authorities, you can build trust with your community, ensuring your token is secure and immutable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrustSection;