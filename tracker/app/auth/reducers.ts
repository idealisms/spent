import { ActionType, AuthAction } from './actions';
import { AuthStatus, IAuthState } from './model';
import { Reducer } from 'redux';

const initialAuthState: IAuthState = {
  authStatus: AuthStatus.INIT,
  dropboxAccessToken: localStorage.getItem('dropboxToken') || '',
  downloadStatuses: {},
};

export const authReducer: Reducer<IAuthState, AuthAction> = (
  state = initialAuthState,
  action
): IAuthState => {
  switch (action.type) {
    case ActionType.SET_DROPBOX_ACCESS_TOKEN:
      return {
        ...state,
        dropboxAccessToken: action.token,
      };
    case ActionType.SET_AUTH_STATUS:
      return {
        ...state,
        authStatus: action.authStatus,
      };
    case ActionType.DROPBOX_DOWNLOAD_COMPLETED: {
      const downloadStatuses = {
        ...state.downloadStatuses,
        [action.path]: action.authStatus,
      };
      let authStatus = state.authStatus;
      // Compute main auth status once both files have completed.
      if (Object.keys(downloadStatuses).length === 2) {
        if (
          Object.values(downloadStatuses).every(
            status => status === AuthStatus.OK
          )
        ) {
          authStatus = AuthStatus.OK;
        } else {
          authStatus = AuthStatus.NEEDS_LOGIN;
        }
      }
      return {
        ...state,
        authStatus,
        downloadStatuses,
      };
    }
    default:
      return state;
  }
};
