import { combineReducers, Reducer } from 'redux';
import { transactionsReducer } from '../transactions';
import { authReducer } from '../auth/reducers';
import { ActionType, SettingsAction } from './actions';
import { getDefaultCategories } from './components/Report';
import { CloudState, ISettingsState } from './model';

const initialSettingsState: ISettingsState = {
  lastUpdated: 0,
  cloudState: CloudState.Done,

  settings: {
    version: 0,
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
    case ActionType.SET_SETTINGS_CLOUD_STATE:
      return {
        ...state,
        cloudState: action.cloudState,
      };

    default:
      return state;
  }
};

export const rootReducer = combineReducers({
  auth: authReducer,
  settings: settingsReducer,
  transactions: transactionsReducer,
});
