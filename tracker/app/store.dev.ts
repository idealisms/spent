import { routerMiddleware } from 'connected-react-router';
import { History } from 'history';
import { applyMiddleware, compose, createStore, Store } from 'redux';
import { createLogger } from 'redux-logger';
import thunkMiddleware from 'redux-thunk';
import { createRootReducer, IAppState } from './main';

interface IHotModule {
  hot?: { accept: (path: string, callback: () => void) => void };
}

declare const require: (name: String) => any;
declare const module: IHotModule;

const loggerMiddleware = createLogger();

export function configureStore(history: History): Store<IAppState> {

  const routingMiddleware = routerMiddleware(history);
  const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancers = composeEnhancers(
    applyMiddleware(
      routingMiddleware,
      thunkMiddleware,
      loggerMiddleware),
  );

  const store = createStore(createRootReducer(history), enhancers);

  if (module.hot) {
    module.hot.accept('./main/reducers', () => {
      const nextRootReducer: any = require('./main/reducers').rootReducer;
      store.replaceReducer(nextRootReducer);
    });
  }

  return store;
}
