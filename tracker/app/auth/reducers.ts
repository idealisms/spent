import { ActionType, AuthAction } from './actions';
import { IAuthState } from './Model';
import { Reducer } from 'redux';

const initialAuthState: IAuthState = {
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
    default:
      return state;
  }
};
