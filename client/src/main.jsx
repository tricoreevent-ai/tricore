import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { googleAuthConfig } from './config/googleAuth.js';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

const app = (
  <BrowserRouter>
    <AuthProvider>
      <AdminAuthProvider>
        <App />
      </AdminAuthProvider>
    </AuthProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleAuthConfig.hasClientId ? (
      <GoogleOAuthProvider clientId={googleAuthConfig.clientId}>{app}</GoogleOAuthProvider>
    ) : (
      app
    )}
  </React.StrictMode>
);
