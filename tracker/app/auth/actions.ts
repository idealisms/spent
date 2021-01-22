import { ThunkAction } from 'redux-thunk';
import { IAppState } from '../main/model';
import { AuthStatus } from './model';
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
  DROPBOX_DOWNLOAD_COMPLETED = 'DROPBOX_DOWNLOAD_COMPLETED',
}

// Action creators
export const setDropboxAccessToken = (token: string) => {
  window.localStorage.setItem('dropboxToken', token);
  return {
    type: ActionType.SET_DROPBOX_ACCESS_TOKEN as typeof ActionType.SET_DROPBOX_ACCESS_TOKEN,
    token,
  };
};

const setAuthStatus = (authStatus: AuthStatus) => ({
  type: ActionType.SET_AUTH_STATUS as typeof ActionType.SET_AUTH_STATUS,
  authStatus,
});

export const dropboxDownloadCompleted = (
  path: string,
  authStatus: AuthStatus
) => ({
  type: ActionType.DROPBOX_DOWNLOAD_COMPLETED as typeof ActionType.DROPBOX_DOWNLOAD_COMPLETED,
  path,
  authStatus,
});

export type AuthAction =
  | ReturnType<typeof setDropboxAccessToken>
  | ReturnType<typeof setAuthStatus>
  | ReturnType<typeof dropboxDownloadCompleted>;

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
      dispatch(fetchSettingsFromDropboxIfNeeded());
    } else {
      dispatch(setAuthStatus(AuthStatus.NEEDS_LOGIN));
    }
  };
};
