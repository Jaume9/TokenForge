import React, { useState, useEffect } from 'react';
import './styles.css';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner">
      <p>
        This website uses cookies to enhance the user experience. By continuing to use this site, you agree to our use of cookies. 
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Learn more</a>.
      </p>
      <button onClick={handleAccept} className="accept-button">Accept</button>
    </div>
  );
};

export default CookieConsent;