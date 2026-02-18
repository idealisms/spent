import {
  applyMiddleware,
  compose,
  legacy_createStore as createStore,
  Store,
} from 'redux';
import { createLogger } from 'redux-logger';
import thunkMiddleware from 'redux-thunk';
import { rootReducer, IAppState } from './main';

interface IHotModule {
  hot?: { accept: (path: string, callback: () => void) => void };
}

declare const require: (name: string) => any;
declare const module: IHotModule;

const loggerMiddleware = createLogger();

export function configureStore(): Store<IAppState> {
  const composeEnhancers =
    (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancers = composeEnhancers(
    applyMiddleware(thunkMiddleware, loggerMiddleware as any)
  );

  const store = createStore(rootReducer, enhancers) as Store<IAppState>;

  if (module.hot) {
    module.hot.accept('./main/reducers', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nextRootReducer: any = require('./main/reducers').rootReducer;
      store.replaceReducer(nextRootReducer);
    });
  }

  return store;
}
