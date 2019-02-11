
import { routerReducer } from 'react-router-redux';
import { combineReducers, Reducer } from 'redux';
import { IAppState } from './Model';

export const rootReducer: Reducer<IAppState> = combineReducers<IAppState>({
  routing: routerReducer,
});
