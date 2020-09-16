import * as Dropbox from 'dropbox';
import { ThunkAction } from 'redux-thunk';
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
export const receivedSettingsFromDropbox = (settings?: ISettings) => ({
  type: ActionType.RECEIVED_SETTINGS_FROM_DROPBOX as typeof ActionType.RECEIVED_SETTINGS_FROM_DROPBOX,
  settings: settings,
});

export const updateSetting = (
    key: keyof ISettings,
    value: ISettings[keyof ISettings]
) => ({
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

export type SettingsAction =
  | ReturnType<typeof requestSettingsFromDropbox>
  | ReturnType<typeof receivedSettingsFromDropbox>
  | ReturnType<typeof updateSetting>
  | ReturnType<typeof requestSaveSettingsToDropbox>
  | ReturnType<typeof finishedSaveSettingsToDropbox>;

// Async actions
export const fetchSettingsFromDropbox = (): ThunkAction<
void,
IAppState,
null,
SettingsAction
> => {
  return async (dispatch, getState) => {
    dispatch(requestSettingsFromDropbox());

    const state = getState();
    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
      fetch,
    });
    try {
      const file = await dbx.filesDownload({
        path: '/Apps/quant-tc/settings.json',
      });
      let fr = new FileReader();
      fr.addEventListener('load', _event => {
        let settings: ISettings = JSON.parse(fr.result as string);
        dispatch(receivedSettingsFromDropbox(settings));
      });
      fr.addEventListener('error', ev => {
        console.log(ev);
        dispatch(receivedSettingsFromDropbox());
      });
      fr.readAsText((file as any).fileBlob);
    } catch (error) {
      console.info(`settings.json download failed, ignoring. ${error}`);
      dispatch(receivedSettingsFromDropbox());
    }
  };
};

export const fetchSettingsFromDropboxIfNeeded = (): ThunkAction<
void,
IAppState,
null,
SettingsAction
> => {
  return async (dispatch, getState) => {
    let state = getState();
    if (state.settings.lastUpdated == 0) {
      dispatch(fetchSettingsFromDropbox());
    }
  };
};

export const saveSettingsToDropbox = (): ThunkAction<
void,
IAppState,
null,
SettingsAction
> => {
  return async (dispatch, getState) => {
    dispatch(requestSaveSettingsToDropbox());

    const state = getState();
    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
      fetch,
    });
    let filesCommitInfo = {
      contents: JSON.stringify(state.settings.settings, null, 2),
      path: '/Apps/quant-tc/settings.json',
      mode: { '.tag': 'overwrite' } as DropboxTypes.files.WriteModeOverwrite,
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
