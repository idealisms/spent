import { ActionType, AuthAction } from './actions';
import { AuthStatus, IAuthState } from './Model';
import { Reducer } from 'redux';

const initialAuthState: IAuthState = {
  authStatus: AuthStatus.INIT,
  dropboxAccessToken: localStorage.getItem('dropboxToken') || '',
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
    default:
      return state;
  }
};
