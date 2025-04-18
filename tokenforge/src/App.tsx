import React from 'react';
import './App.css';
import ConnectPhantomButton from './components/ConnectPhantomButton';
import TokenCreatorForm from './components/TokenCreatorForm';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>TokenForge</h1>
        <ConnectPhantomButton />
      </header>
      <main>
        <TokenCreatorForm />
      </main>
    </div>
  );
}

export default App;