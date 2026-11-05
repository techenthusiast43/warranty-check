import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppWeb3Provider } from './contexts/Web3Context';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWeb3Provider>
      <App />
    </AppWeb3Provider>
  </React.StrictMode>
);

