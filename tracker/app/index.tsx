import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Store } from 'redux';
import { App, IAppState } from './main';
import { theme } from './muiTheme';
import * as serviceWorker from './serviceWorker';

declare const require: (name: string) => any;

serviceWorker.register();

const store: Store<IAppState> =
  process.env.NODE_ENV !== 'production'
    ? (require('./store.dev') as any).configureStore() // eslint-disable-line @typescript-eslint/no-var-requires
    : (require('./store.prod') as any).configureStore(); // eslint-disable-line @typescript-eslint/no-var-requires

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterMoment}>
          <App />
        </LocalizationProvider>
      </BrowserRouter>
    </ThemeProvider>
  </Provider>
);
