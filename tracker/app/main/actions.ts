import * as Dropbox from 'dropbox';
import { AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { ACCESS_TOKEN } from '../config';
import { IAppState, ISettings } from './Model';

// Action types
export enum ActionType {
  REQUEST_SETTINGS_FROM_DROPBOX = 'REQUEST_SETTINGS_FROM_DROPBOX',
  RECEIVED_SETTINGS_FROM_DROPBOX = 'RECEIVED_SETTINGS_FROM_DROPBOX',

  UPDATE_SETTING = 'UPDATE_SETTING',
}

// Action creators
// We can also use { createAction } from the redux-actions library.
export const requestSettingsFromDropbox = () => ({
  type: ActionType.REQUEST_SETTINGS_FROM_DROPBOX,
});
export const receivedSettingsFromDropbox = (success: boolean, settings?: ISettings) => ({
  type: ActionType.RECEIVED_SETTINGS_FROM_DROPBOX,
  success,
  settings: settings,
});

export const updateSetting = (key: keyof ISettings, value: ISettings[keyof ISettings]) => ({
  type: ActionType.UPDATE_SETTING,
  key,
  value,
});

export type SettingsAction = (
  ReturnType<typeof requestSettingsFromDropbox> &
  ReturnType<typeof receivedSettingsFromDropbox> &
  ReturnType<typeof updateSetting>
);

// Async actions.
export const fetchSettingsFromDropbox = (): ThunkAction<void, IAppState, null, AnyAction> => {
  return async (dispatch) => {
    dispatch(requestSettingsFromDropbox());

    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN, fetch });
    try {
      const file = await dbx.filesDownload({ path: '/settings.json' });
      let fr = new FileReader();
      fr.addEventListener('load', ev => {
        let settings: ISettings = JSON.parse((fr.result as string));
        dispatch(receivedSettingsFromDropbox(true, settings));
      });
      fr.addEventListener('error', ev => {
        console.log(ev);
        dispatch(receivedSettingsFromDropbox(false));
      });
      fr.readAsText((file as any).fileBlob);
    } catch (error) {
      console.info(`settings.json download failed, ignoring. ${error}`);
      dispatch(receivedSettingsFromDropbox(false));
    }
  };
};

export const fetchSettingsFromDropboxIfNeeded = (): ThunkAction<void, IAppState, null, AnyAction> => {
  return async (dispatch, getState) => {
    let state = getState();
    if (state.settings.lastUpdated == 0) {
      dispatch(fetchSettingsFromDropbox());
    }
  };
};
