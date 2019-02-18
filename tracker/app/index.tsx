import * as MomentUtils from '@date-io/moment';
import { MuiThemeProvider } from '@material-ui/core/styles';
import { createHashHistory } from 'history';
import { MuiPickersUtilsProvider } from 'material-ui-pickers';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';
import { Store } from 'redux';
import { App, IAppState } from './main';
import { theme } from './muiTheme';


declare const require: (name: String) => any;

const history = createHashHistory();

const store: Store<IAppState> = (process.env.NODE_ENV !== 'production')
        ? (require('./store.dev') as any).configureStore(history)
        : (require('./store.prod') as any).configureStore(history);



ReactDOM.render(
    <Provider store={store}>
      <MuiThemeProvider theme={theme}>
        <ConnectedRouter store={store} history={history}>
          <MuiPickersUtilsProvider utils={MomentUtils}>
            <App/>
          </MuiPickersUtilsProvider>
        </ConnectedRouter>
      </MuiThemeProvider>
    </Provider>,
    document.getElementById('app'),
);
