import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/main.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Removed StrictMode to prevent double-rendering issues with Supabase auth
  // StrictMode causes components to render twice in development, which can cause
  // "Multiple GoTrueClient instances" warnings from Supabase
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

