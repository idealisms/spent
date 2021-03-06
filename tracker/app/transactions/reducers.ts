import { Reducer } from 'redux';
import { CloudState } from '../main/model';
import { ActionType, TransactionsAction } from './actions';
import { ITransactionsState } from './model';

const initialState: ITransactionsState = {
  lastUpdated: 0,
  cloudState: CloudState.Done,

  transactions: [],
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
    case ActionType.SET_TRANSACTIONS_CLOUD_STATE:
      return {
        ...state,
        cloudState: action.cloudState,
      };

    default:
      return state;
  }
};
