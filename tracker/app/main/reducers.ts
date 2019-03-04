import { routerReducer } from 'react-router-redux';
import { combineReducers, Reducer } from 'redux';
import { transactionsReducer } from '../transactions';
import { ActionType, SettingsAction } from './actions';
import { getDefaultCategories } from './components/Report';
import { CloudState, IAppState, ISettingsState } from './Model';

const initialState: ISettingsState = {
  isFetching: false,
  lastUpdated: 0,
  cloudState: CloudState.Done,

  settings: {
    reportCategories: [],
  },
};

export const settingsReducer: Reducer<ISettingsState, SettingsAction> = (state = initialState, action) => {
  switch (action.type) {
    case ActionType.REQUEST_SETTINGS_FROM_DROPBOX:
      return {
        ...state,
        isFetching: true,
      };
    case ActionType.RECEIVED_SETTINGS_FROM_DROPBOX:
      if (action.settings) {
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
          settings: {
            ...state.settings,
            reportCategories: getDefaultCategories(),
          },
        };
      }
    case ActionType.UPDATE_SETTING:
      return {
        ...state,
        cloudState: CloudState.Modified,
        settings: {
          ...state.settings,
          [action.key]: action.value,
        },
      };
    case ActionType.REQUEST_SAVE_SETTINGS_TO_DROPBOX:
      return {
        ...state,
        cloudState: CloudState.Uploading,
      };
    case ActionType.FINISHED_SAVE_SETTINGS_TO_DROPBOX:
      return {
        ...state,
        cloudState: action.success ? CloudState.Done : CloudState.Modified,
      };

    default:
      return state;
  }
};

export const rootReducer: Reducer<IAppState> = combineReducers({
  routing: routerReducer,
  settings: settingsReducer,
  transactions: transactionsReducer,
});
