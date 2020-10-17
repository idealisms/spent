export enum AuthStatus {
  INIT,
  CHECKING,
  NEEDS_LOGIN,
  OK,
}

export interface IAuthState {
  authStatus: AuthStatus;
  dropboxAccessToken: string;
  downloadStatuses: Record<string, AuthStatus>;
}
