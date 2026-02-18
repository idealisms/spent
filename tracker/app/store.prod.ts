import {
  applyMiddleware,
  compose,
  legacy_createStore as createStore,
  Store,
} from 'redux';
import thunkMiddleware from 'redux-thunk';
import { rootReducer, IAppState } from './main';

export function configureStore(): Store<IAppState> {
  const enhancers = compose(applyMiddleware(thunkMiddleware));

  return createStore(rootReducer, enhancers as any) as Store<IAppState>;
}
