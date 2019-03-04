import * as Dropbox from 'dropbox';
import { ThunkAction } from 'redux-thunk';
import { ACCESS_TOKEN } from '../config';
import { IAppState } from '../main/Model';
import { ITransaction } from './Model';

// Action types
export enum ActionType {
  REQUEST_TRANSACTIONS_FROM_DROPBOX = 'REQUEST_TRANSACTIONS_FROM_DROPBOX',
  RECEIVED_TRANSACTIONS_FROM_DROPBOX = 'RECEIVED_TRANSACTIONS_FROM_DROPBOX',

  UPDATE_TRANSACTIONS = 'UPDATE_TRANSACTIONS',

  REQUEST_SAVE_TRANSACTIONS_TO_DROPBOX = 'REQUEST_SAVE_TRANSACTIONS_TO_DROPBOX',
  FINISHED_SAVE_TRANSACTIONS_TO_DROPBOX = 'FINISHED_SAVE_TRANSACTIONS_TO_DROPBOX',
}

// Action creators
export const requestTransactionsFromDropbox = () => ({
  type: ActionType.REQUEST_TRANSACTIONS_FROM_DROPBOX as typeof ActionType.REQUEST_TRANSACTIONS_FROM_DROPBOX,
});
export const receivedTransactionsFromDropbox = (transactions?: ITransaction[]) => ({
  type: ActionType.RECEIVED_TRANSACTIONS_FROM_DROPBOX as typeof ActionType.RECEIVED_TRANSACTIONS_FROM_DROPBOX,
  transactions,
});

export const updateTransactions = (transactions: ITransaction[]) => ({
  type: ActionType.UPDATE_TRANSACTIONS as typeof ActionType.UPDATE_TRANSACTIONS,
  transactions,
});

export const requestSaveTransactionsToDropbox = () => ({
  type: ActionType.REQUEST_SAVE_TRANSACTIONS_TO_DROPBOX as typeof ActionType.REQUEST_SAVE_TRANSACTIONS_TO_DROPBOX,
});
export const finishedSaveTransactionsToDropbox = (success: boolean) => ({
  type: ActionType.FINISHED_SAVE_TRANSACTIONS_TO_DROPBOX as typeof ActionType.FINISHED_SAVE_TRANSACTIONS_TO_DROPBOX,
  success,
});

export type TransactionsAction = (
  ReturnType<typeof requestTransactionsFromDropbox> |
  ReturnType<typeof receivedTransactionsFromDropbox> |
  ReturnType<typeof updateTransactions> |
  ReturnType<typeof requestSaveTransactionsToDropbox> |
  ReturnType<typeof finishedSaveTransactionsToDropbox>
);

// Async actions
export const fetchTransactionsFromDropboxIfNeeded = (): ThunkAction<void, IAppState, null, TransactionsAction> => {
  return async (dispatch, getState) => {
    let state = getState();
    if (state.transactions.lastUpdated != 0) {
      return;
    }
    dispatch(requestTransactionsFromDropbox());
    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN, fetch });
    try {
      const file = await dbx.filesDownload({ path: '/transactions.json' });
      let fr = new FileReader();
      fr.addEventListener('load', ev => {
        let transactions: ITransaction[] = JSON.parse((fr.result as string));
        dispatch(receivedTransactionsFromDropbox(transactions));
      });
      fr.addEventListener('error', ev => {
        console.log(ev);
        dispatch(receivedTransactionsFromDropbox());
      });
      // NOTE: The Dropbox SDK specification does not include a fileBlob
      // field on the FileLinkMetadataReference type, so it is missing from
      // the TypeScript type. This field is injected by the Dropbox SDK.
      fr.readAsText((file as any).fileBlob);
    } catch (error) {
      console.info(`transactions.json download failed, ignoring. ${error}`);
      dispatch(receivedTransactionsFromDropbox());
    }
  };
};

export const saveTransactionsToDropbox = (): ThunkAction<void, IAppState, null, TransactionsAction> => {
  return async (dispatch, getState) => {
    dispatch(requestSaveTransactionsToDropbox());

    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN, fetch: fetch });
    let filesCommitInfo = {
      contents: JSON.stringify(getState().transactions.transactions),
      path: '/transactions.json',
      mode: {'.tag': 'overwrite'} as DropboxTypes.files.WriteModeOverwrite,
      autorename: false,
      mute: false,
    };
    try {
      const metadata = await dbx.filesUpload(filesCommitInfo);
      console.log(metadata);
      dispatch(finishedSaveTransactionsToDropbox(true));
    } catch (error) {
      console.info(`settings.json write failed. ${error}`);
      dispatch(finishedSaveTransactionsToDropbox(false));
    }
  };
};
