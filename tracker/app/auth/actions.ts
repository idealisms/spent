// Action types
export enum ActionType {
  SET_DROPBOX_ACCESS_TOKEN = 'SET_DROPBOX_ACCESS_TOKEN',
}

// Action creators
export const setDropboxAccessToken = (token: string) => {
  window.localStorage.setItem('dropboxToken', token);
  return {
    type: ActionType.SET_DROPBOX_ACCESS_TOKEN as typeof ActionType.SET_DROPBOX_ACCESS_TOKEN,
    token,
  };
};

export type AuthAction = ReturnType<typeof setDropboxAccessToken>;
