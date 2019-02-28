import { History } from 'history';
import { routerMiddleware } from 'react-router-redux';
import { applyMiddleware, compose, createStore, Store } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { IAppState, rootReducer } from './main';

export function configureStore(history: History): Store<IAppState> {

  const routingMiddleware = routerMiddleware(history);
  const enhancers = compose(
      applyMiddleware(routingMiddleware, thunkMiddleware));

  return createStore(rootReducer, enhancers);
}
