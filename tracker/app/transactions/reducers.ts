import { Reducer } from 'redux';
import { CloudState } from '../main/Model';
import { ActionType, TransactionsAction } from './actions';
import { ITransactionsState } from './Model';

const initialState: ITransactionsState = {
  isFetching: false,
  lastUpdated: 0,
  cloudState: CloudState.Done,

  transactions: [],
};

export const transactionsReducer: Reducer<ITransactionsState, TransactionsAction> = (state = initialState, action) => {
  switch (action.type) {
    case ActionType.REQUEST_TRANSACTIONS_FROM_DROPBOX:
      return {
        ...state,
        isFetching: true,
      };
    case ActionType.RECEIVED_TRANSACTIONS_FROM_DROPBOX:
      if (action.transactions) {
        return {
          ...state,
          isFetching: false,
          lastUpdated: Date.now(),
          transactions: action.transactions,
        };
      } else {
        return {
          ...state,
          isFetching: false,
          transactions: [],
        };
      }
    case ActionType.UPDATE_TRANSACTIONS:
      return {
        ...state,
        transactions: action.transactions,
        cloudState: CloudState.Modified,
      };
    case ActionType.REQUEST_SAVE_TRANSACTIONS_TO_DROPBOX:
      return {
        ...state,
        cloudState: CloudState.Uploading,
      };
    case ActionType.FINISHED_SAVE_TRANSACTIONS_TO_DROPBOX:
      return {
        ...state,
        cloudState: action.success ? CloudState.Done : CloudState.Modified,
      };

    default:
      return state;
  }
};
