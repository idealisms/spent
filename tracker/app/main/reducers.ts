import { routerReducer } from 'react-router-redux';
import { combineReducers, Reducer } from 'redux';
import { ActionType, SettingsAction } from './actions';
import { IAppState, ISettingsState } from './Model';

const initialState: ISettingsState = {
  isFetching: false,
  isSaving: false,
  lastUpdated: 0,

  settings: {
    reportCategories: [],
  },
};

export const settingsReducer = (state: ISettingsState = initialState, action: SettingsAction): ISettingsState => {
  switch (action.type) {
    case ActionType.REQUEST_SETTINGS_FROM_DROPBOX:
      return {
        ...state,
        isFetching: true,
      };
    case ActionType.RECEIVED_SETTINGS_FROM_DROPBOX:
      if (action.success && action.settings) {
        return {
          ...state,
          isFetching: false,
          lastUpdated: Date.now(),
          settings: action.settings,
        };
      } else {
        return {
          ...state,
          isFetching: false,
        };
      }
    case ActionType.UPDATE_SETTING:
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.key]: action.value,
        },
      };

    default:
      return state;
  }
};

export const rootReducer: Reducer<IAppState> = combineReducers({
  routing: routerReducer,
  settings: settingsReducer,
});
