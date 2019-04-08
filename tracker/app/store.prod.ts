import { routerMiddleware } from 'connected-react-router';
import { History } from 'history';
import { applyMiddleware, compose, createStore, Store } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { createRootReducer, IAppState } from './main';

export function configureStore(history: History): Store<IAppState> {

  const routingMiddleware = routerMiddleware(history);
  const enhancers = compose(
      applyMiddleware(routingMiddleware, thunkMiddleware));

  return createStore(createRootReducer(history), enhancers);
}
