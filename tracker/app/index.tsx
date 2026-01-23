import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { ConnectedRouter as BaseConnectedRouter } from 'connected-react-router';
import { createBrowserHistory } from 'history';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { App, IAppState } from './main';
import { theme } from './muiTheme';
import * as serviceWorker from './serviceWorker';

declare const require: (name: string) => any;

// connected-react-router doesn't have proper React 18 types for children
const ConnectedRouter = BaseConnectedRouter as React.ComponentType<any>;

serviceWorker.register();

const history = createBrowserHistory();

const store: Store<IAppState> =
  process.env.NODE_ENV !== 'production'
    ? (require('./store.dev') as any).configureStore(history) // eslint-disable-line @typescript-eslint/no-var-requires
    : (require('./store.prod') as any).configureStore(history); // eslint-disable-line @typescript-eslint/no-var-requires

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <ConnectedRouter history={history}>
        <LocalizationProvider dateAdapter={AdapterMoment}>
          <App />
        </LocalizationProvider>
      </ConnectedRouter>
    </ThemeProvider>
  </Provider>
);
