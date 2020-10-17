import * as Dropbox from 'dropbox';
import { ThunkAction } from 'redux-thunk';
import { CloudState, IAppState, ISettings } from './Model';

// Action types
export enum ActionType {
  RECEIVED_SETTINGS_FROM_DROPBOX = 'RECEIVED_SETTINGS_FROM_DROPBOX',

  UPDATE_SETTING = 'UPDATE_SETTING',

  SET_SETTINGS_CLOUD_STATE = 'SET_SETTINGS_CLOUD_STATE',
}

// Action creators
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

const setCloudState = (cloudState: CloudState) => ({
  type: ActionType.SET_SETTINGS_CLOUD_STATE as typeof ActionType.SET_SETTINGS_CLOUD_STATE,
  cloudState,
});

export type SettingsAction =
  | ReturnType<typeof receivedSettingsFromDropbox>
  | ReturnType<typeof updateSetting>
  | ReturnType<typeof setCloudState>;

// Async actions
export const fetchSettingsFromDropbox = (): ThunkAction<
void,
IAppState,
null,
SettingsAction
> => {
  return async (dispatch, getState) => {
    const state = getState();
    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
      fetch,
    });
    try {
      const file = await dbx.filesDownload({
        path: '/spent tracker/settings.json',
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
    dispatch(setCloudState(CloudState.Uploading));

    const state = getState();
    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
      fetch,
    });
    let filesCommitInfo = {
      contents: JSON.stringify(state.settings.settings, null, 2),
      path: '/spent tracker/settings.json',
      mode: { '.tag': 'overwrite' } as DropboxTypes.files.WriteModeOverwrite,
      autorename: false,
      mute: false,
    };
    try {
      const metadata = await dbx.filesUpload(filesCommitInfo);
      console.log(metadata);
      dispatch(setCloudState(CloudState.Done));
    } catch (error) {
      console.info(`settings.json write failed. ${error}`);
      dispatch(setCloudState(CloudState.Modified));
    }
  };
};
