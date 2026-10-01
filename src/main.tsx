import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './styles.css';
import App from './App';

const theme = createTheme({
  primaryColor: 'forest',
  colors: { forest: ['#eff7f4', '#dceae3', '#b8d3c7', '#91bba9', '#70a78f', '#579b7f', '#234f47', '#1e463e', '#183c35', '#103329'] },
  fontFamily: '"Inter", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light"><App /></MantineProvider>
  </React.StrictMode>,
);
