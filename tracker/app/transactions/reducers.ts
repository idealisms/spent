import { Reducer } from 'redux';
import { CloudState } from '../main/model';
import { ActionType, TransactionsAction } from './actions';
import { ITransactionsState } from './model';
import { collectIds } from './utils';

const initialState: ITransactionsState = {
  lastUpdated: 0,
  cloudState: CloudState.Done,

  transactions: [],
  baseIds: [],
};

export const transactionsReducer: Reducer<
  ITransactionsState,
  TransactionsAction
> = (state = initialState, action) => {
  switch (action.type) {
    case ActionType.RECEIVED_TRANSACTIONS_FROM_DROPBOX:
      if (action.transactions) {
        return {
          ...state,
          lastUpdated: Date.now(),
          transactions: action.transactions,
          rev: action.rev,
          baseIds: collectIds(action.transactions),
        };
      } else {
        return {
          ...state,
          transactions: [],
        };
      }
    case ActionType.UPDATE_TRANSACTIONS:
      return {
        ...state,
        transactions: action.transactions,
        cloudState: CloudState.Modified,
      };
    case ActionType.MERGED_REMOTE_TRANSACTIONS:
      return {
        ...state,
        transactions: action.transactions,
        rev: action.rev,
        baseIds: action.baseIds,
      };
    case ActionType.SAVED_TRANSACTIONS_TO_DROPBOX:
      return {
        ...state,
        rev: action.rev,
        baseIds: action.baseIds,
      };
    case ActionType.SET_TRANSACTIONS_CLOUD_STATE:
      return {
        ...state,
        cloudState: action.cloudState,
      };

    default:
      return state;
  }
};
