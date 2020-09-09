import MomentUtils from '@date-io/moment';
import { MuiThemeProvider } from '@material-ui/core/styles';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import { ConnectedRouter } from 'connected-react-router';
import { createBrowserHistory } from 'history';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { App, IAppState } from './main';
import { theme } from './muiTheme';
import * as serviceWorker from './serviceWorker';

declare const require: (name: string) => any;

serviceWorker.register();

const history = createBrowserHistory();

const store: Store<IAppState> =
  process.env.NODE_ENV !== 'production'
    ? (require('./store.dev') as any).configureStore(history) // eslint-disable-line @typescript-eslint/no-var-requires
    : (require('./store.prod') as any).configureStore(history); // eslint-disable-line @typescript-eslint/no-var-requires

ReactDOM.render(
    <Provider store={store}>
      <MuiThemeProvider theme={theme}>
        <ConnectedRouter history={history}>
          <MuiPickersUtilsProvider utils={MomentUtils}>
            <App />
          </MuiPickersUtilsProvider>
        </ConnectedRouter>
      </MuiThemeProvider>
    </Provider>,
    document.getElementById('app')
);
