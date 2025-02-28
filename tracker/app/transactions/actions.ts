import * as Dropbox from 'dropbox';
import { ThunkAction } from 'redux-thunk';
import { CloudState, IAppState } from '../main/model';
import { ITransaction } from './model';
import { AuthAction, dropboxDownloadCompleted } from '../auth/actions';
import { AuthStatus } from '../auth/model';

// Action types
export enum ActionType {
  REQUEST_TRANSACTIONS_FROM_DROPBOX = 'REQUEST_TRANSACTIONS_FROM_DROPBOX',
  RECEIVED_TRANSACTIONS_FROM_DROPBOX = 'RECEIVED_TRANSACTIONS_FROM_DROPBOX',

  UPDATE_TRANSACTIONS = 'UPDATE_TRANSACTIONS',

  SET_TRANSACTIONS_CLOUD_STATE = 'SET_TRANSACTIONS_CLOUD_STATE',
}

// Action creators
const receivedTransactionsFromDropbox = (transactions?: ITransaction[]) => ({
  type: ActionType.RECEIVED_TRANSACTIONS_FROM_DROPBOX as typeof ActionType.RECEIVED_TRANSACTIONS_FROM_DROPBOX,
  transactions,
});

export const updateTransactions = (transactions: ITransaction[]) => ({
  type: ActionType.UPDATE_TRANSACTIONS as typeof ActionType.UPDATE_TRANSACTIONS,
  transactions,
});

const setCloudState = (cloudState: CloudState) => ({
  type: ActionType.SET_TRANSACTIONS_CLOUD_STATE as typeof ActionType.SET_TRANSACTIONS_CLOUD_STATE,
  cloudState,
});

export type TransactionsAction =
  | ReturnType<typeof receivedTransactionsFromDropbox>
  | ReturnType<typeof updateTransactions>
  | ReturnType<typeof setCloudState>;

// Async actions
export const fetchTransactionsFromDropboxIfNeeded = (): ThunkAction<
  void,
  IAppState,
  null,
  TransactionsAction | AuthAction
> => {
  return async (dispatch, getState) => {
    const state = getState();
    if (state.transactions.lastUpdated != 0) {
      return;
    }
    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
    });
    const path = '/spent tracker/transactions.json';
    try {
      const response = await dbx.filesDownload({ path });
      let fr = new FileReader();
      fr.addEventListener('load', _event => {
        let transactions: ITransaction[] = JSON.parse(fr.result as string);
        dispatch(receivedTransactionsFromDropbox(transactions));
        dispatch(dropboxDownloadCompleted(path, AuthStatus.OK));
      });
      fr.addEventListener('error', ev => {
        console.log(ev);
        dispatch(receivedTransactionsFromDropbox());
        dispatch(dropboxDownloadCompleted(path, AuthStatus.NEEDS_LOGIN));
      });
      // NOTE: The Dropbox SDK specification does not include a fileBlob
      // field on the FileLinkMetadataReference type, so it is missing from
      // the TypeScript type. This field is injected by the Dropbox SDK.
      fr.readAsText((response.result as any).fileBlob);
    } catch (error) {
      console.info(`transactions.json download failed, ignoring. ${error}`);
      dispatch(receivedTransactionsFromDropbox());
      dispatch(dropboxDownloadCompleted(path, AuthStatus.NEEDS_LOGIN));
    }
  };
};

export const saveTransactionsToDropbox = (): ThunkAction<
  void,
  IAppState,
  null,
  TransactionsAction
> => {
  return async (dispatch, getState) => {
    const state = getState();
    dispatch(setCloudState(CloudState.Uploading));

    let dbx = new Dropbox.Dropbox({
      accessToken: state.auth.dropboxAccessToken,
    });
    let filesCommitInfo = {
      contents: JSON.stringify(state.transactions.transactions),
      path: '/spent tracker/transactions.json',
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
