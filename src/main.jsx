import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Import global styles (reset and variables)
import './styles/global.css';
// Import MDX Editor styles first
import '@mdxeditor/editor/style.css';
// Import KaTeX styles for math rendering
import 'katex/dist/katex.min.css';
// Import component layout styles bundle
import './components/styles/components.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
