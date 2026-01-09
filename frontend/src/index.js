import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import reportWebVitals from './reportWebVitals';
import { CustomProvider } from '@leegality/leegality-react-component-library';

ReactDOM.render(
  <React.StrictMode>
    <CustomProvider locale="en-US">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </CustomProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
