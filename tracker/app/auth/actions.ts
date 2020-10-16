import { ThunkAction } from 'redux-thunk';
import { IAppState } from '../main/Model';
import { AuthStatus } from './Model';
import {
  fetchTransactionsFromDropboxIfNeeded,
  TransactionsAction,
} from '../transactions/actions';
import {
  fetchSettingsFromDropboxIfNeeded,
  SettingsAction,
} from '../main/actions';

// Action types
export enum ActionType {
  SET_DROPBOX_ACCESS_TOKEN = 'SET_DROPBOX_ACCESS_TOKEN',
  SET_AUTH_STATUS = 'SET_AUTH_STATUS',
}

// Action creators
export const setDropboxAccessToken = (token: string) => {
  window.localStorage.setItem('dropboxToken', token);
  return {
    type: ActionType.SET_DROPBOX_ACCESS_TOKEN as typeof ActionType.SET_DROPBOX_ACCESS_TOKEN,
    token,
  };
};

export const setAuthStatus = (authStatus: AuthStatus) => ({
  type: ActionType.SET_AUTH_STATUS as typeof ActionType.SET_AUTH_STATUS,
  authStatus,
});

export type AuthAction =
  | ReturnType<typeof setDropboxAccessToken>
  | ReturnType<typeof setAuthStatus>;

// Async actions
export const tryLogin = (): ThunkAction<
void,
IAppState,
null,
AuthAction | TransactionsAction | SettingsAction
> => {
  return async (dispatch, getState) => {
    const state = getState();
    if (state.auth.authStatus != AuthStatus.INIT) {
      return;
    }

    if (state.auth.dropboxAccessToken) {
      dispatch(setAuthStatus(AuthStatus.CHECKING));
      dispatch(fetchTransactionsFromDropboxIfNeeded());
      // TODO: Also set authStatus in fetchSettings.
      dispatch(fetchSettingsFromDropboxIfNeeded());
    } else {
      dispatch(setAuthStatus(AuthStatus.NEEDS_LOGIN));
    }
  };
};
