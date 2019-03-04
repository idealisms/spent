import { Reducer } from 'redux';
import { ActionType, TransactionsAction } from './actions';
import { ITransactionsState } from './Model';

const initialState: ITransactionsState = {
  isFetching: false,
  lastUpdated: 0,
  // cloudState: CloudState.Done,

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

    default:
      return state;
  }
};
