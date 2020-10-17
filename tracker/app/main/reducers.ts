import { connectRouter } from 'connected-react-router';
import { History } from 'history';
import { combineReducers, Reducer } from 'redux';
import { transactionsReducer } from '../transactions';
import { authReducer } from '../auth/reducers';
import { ActionType, SettingsAction } from './actions';
import { getDefaultCategories } from './components/Report';
import { CloudState, ISettingsState } from './Model';

const initialSettingsState: ISettingsState = {
  lastUpdated: 0,
  cloudState: CloudState.Done,

  settings: {
    reportCategories: [],
    spendTargets: [],
    dailySpendTarget: {
      startBalanceCents: 0,
      targets: [],
      tags: {
        include: [],
        exclude: [],
      },
    },
  },
};

export const settingsReducer: Reducer<ISettingsState, SettingsAction> = (
    state = initialSettingsState,
    action
) => {
  switch (action.type) {
    case ActionType.RECEIVED_SETTINGS_FROM_DROPBOX:
      if (action.settings) {
        return {
          ...state,
          lastUpdated: Date.now(),
          settings: action.settings,
        };
      } else {
        return {
          ...state,
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

export const createRootReducer = (history: History) =>
  combineReducers({
    router: connectRouter(history),
    auth: authReducer,
    settings: settingsReducer,
    transactions: transactionsReducer,
  });
