import React from 'react';
import { createRoot } from 'react-dom/client';
import AccountApp from './components/AccountApp';
import './index.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><AccountApp /></React.StrictMode>);
