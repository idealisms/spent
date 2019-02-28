import { History } from 'history';
import { routerMiddleware } from 'react-router-redux';
import { applyMiddleware, compose, createStore, Store } from 'redux';
import { createLogger } from 'redux-logger';
import thunkMiddleware from 'redux-thunk';
import { IAppState, rootReducer } from './main';


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

  const result = createStore(rootReducer, enhancers);

  if (module.hot) {
    module.hot.accept('./main/Module', () => {
      const nextRootReducer: any = require('./main/Module').rootReducer;
      result.replaceReducer(nextRootReducer);
    });
  }

  return result;
}
