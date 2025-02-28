import * as Dropbox from 'dropbox';
import { ThunkAction } from 'redux-thunk';
import { CloudState, IAppState, ISettings, SETTINGS_VERSION } from './model';
import { AuthAction, dropboxDownloadCompleted } from '../auth/actions';
import { AuthStatus } from '../auth/model';

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

function upgradeIfNecessary(settings: ISettings) {
  if (settings.version === undefined) {
    // Migrate reportCategories to a map.
    if (Array.isArray(settings.reportCategories)) {
      settings.reportCategories = new Map([
        ['report', settings.reportCategories],
      ]);
    }
    settings.version = SETTINGS_VERSION;
  }
  // FIXME: We incorrectly assumed that a map serialized to
  // json would be read as a map rather than an object. Manually
  // convert from an object to a map.
  if ('report' in settings.reportCategories) {
    const reportCategories = new Map();
    reportCategories.set('report', settings.reportCategories['report']);
    settings.reportCategories = reportCategories;
  }
}

// Async actions
export const fetchSettingsFromDropbox = (): ThunkAction<
  void,
  IAppState,
  null,
  SettingsAction | AuthAction
> => {
  return async (dispatch, getState) => {
    const state = getState();
    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
    });
    const path = '/spent tracker/settings.json';
    try {
      const response = await dbx.filesDownload({ path });
      let fr = new FileReader();
      fr.addEventListener('load', _event => {
        let settings: ISettings = JSON.parse(fr.result as string);
        upgradeIfNecessary(settings);
        dispatch(receivedSettingsFromDropbox(settings));
        dispatch(dropboxDownloadCompleted(path, AuthStatus.OK));
      });
      fr.addEventListener('error', ev => {
        console.log(ev);
        dispatch(receivedSettingsFromDropbox());
        dispatch(dropboxDownloadCompleted(path, AuthStatus.NEEDS_LOGIN));
      });
      fr.readAsText((response.result as any).fileBlob);
    } catch (error) {
      console.info(`settings.json download failed, ignoring. ${error}`);
      dispatch(receivedSettingsFromDropbox());
      dispatch(dropboxDownloadCompleted(path, AuthStatus.NEEDS_LOGIN));
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
    });
    let filesCommitInfo = {
      contents: JSON.stringify(state.settings.settings, null, 2),
      path: '/spent tracker/settings.json',
      mode: { '.tag': 'overwrite' } as Dropbox.files.WriteModeOverwrite,
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
