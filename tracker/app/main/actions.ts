import * as Dropbox from 'dropbox';
import { ThunkAction } from 'redux-thunk';
import { ACCESS_TOKEN } from '../config';
import { IAppState, ISettings } from './Model';

// Action types
export enum ActionType {
  REQUEST_SETTINGS_FROM_DROPBOX = 'REQUEST_SETTINGS_FROM_DROPBOX',
  RECEIVED_SETTINGS_FROM_DROPBOX = 'RECEIVED_SETTINGS_FROM_DROPBOX',

  UPDATE_SETTING = 'UPDATE_SETTING',

  REQUEST_SAVE_SETTINGS_TO_DROPBOX = 'REQUEST_SAVE_SETTINGS_TO_DROPBOX',
  FINISHED_SAVE_SETTINGS_TO_DROPBOX = 'FINISHED_SAVE_SETTINGS_TO_DROPBOX',
}

// Action creators
export const requestSettingsFromDropbox = () => ({
  type: ActionType.REQUEST_SETTINGS_FROM_DROPBOX as typeof ActionType.REQUEST_SETTINGS_FROM_DROPBOX,
});
export const receivedSettingsFromDropbox = (success: boolean, settings?: ISettings) => ({
  type: ActionType.RECEIVED_SETTINGS_FROM_DROPBOX as typeof ActionType.RECEIVED_SETTINGS_FROM_DROPBOX,
  success,
  settings: settings,
});

export const updateSetting = (key: keyof ISettings, value: ISettings[keyof ISettings]) => ({
  type: ActionType.UPDATE_SETTING as typeof ActionType.UPDATE_SETTING,
  key,
  value,
});

export const requestSaveSettingsToDropbox = () => ({
  type: ActionType.REQUEST_SAVE_SETTINGS_TO_DROPBOX as typeof ActionType.REQUEST_SAVE_SETTINGS_TO_DROPBOX,
});
export const finishedSaveSettingsToDropbox = (success: boolean) => ({
  type: ActionType.FINISHED_SAVE_SETTINGS_TO_DROPBOX as typeof ActionType.FINISHED_SAVE_SETTINGS_TO_DROPBOX,
  success,
});

export type SettingsAction = (
  ReturnType<typeof requestSettingsFromDropbox> |
  ReturnType<typeof receivedSettingsFromDropbox> |
  ReturnType<typeof updateSetting> |
  ReturnType<typeof requestSaveSettingsToDropbox> |
  ReturnType<typeof finishedSaveSettingsToDropbox>
);

// Async actions
export const fetchSettingsFromDropbox = (): ThunkAction<void, IAppState, null, SettingsAction> => {
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

export const fetchSettingsFromDropboxIfNeeded = (): ThunkAction<void, IAppState, null, SettingsAction> => {
  return async (dispatch, getState) => {
    let state = getState();
    if (state.settings.lastUpdated == 0) {
      dispatch(fetchSettingsFromDropbox());
    }
  };
};

export const saveSettingsToDropbox = (settings: ISettings): ThunkAction<void, IAppState, null, SettingsAction> => {
  return async (dispatch) => {
    dispatch(requestSaveSettingsToDropbox());

    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN, fetch });
    let filesCommitInfo = {
      contents: JSON.stringify(settings),
      path: '/settings.json',
      mode: {'.tag': 'overwrite'} as DropboxTypes.files.WriteModeOverwrite,
      autorename: false,
      mute: false,
    };
    try {
      const metadata = await dbx.filesUpload(filesCommitInfo);
      console.log(metadata);
      dispatch(finishedSaveSettingsToDropbox(true));
    } catch (error) {
      console.info(`settings.json write failed. ${error}`);
      dispatch(finishedSaveSettingsToDropbox(false));
    }
  };
};
