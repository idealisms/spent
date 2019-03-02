import { RouterState } from 'react-router-redux';
import { ITransactionsState } from '../transactions';

export enum CloudState {
  Done = 1,
  Modified = 2,
  Uploading = 3,
}

export interface IReportNode {
  title: string;
  tags: string[];
  subcategories: IReportNode[];
}

export interface ISettings {
  reportCategories: IReportNode[];
}

export interface ISettingsState {
  isFetching: boolean;
  /** ms since the epoch */
  lastUpdated: number;
  cloudState: CloudState;

  settings: ISettings;
}

export interface IAppState {
  routing: RouterState;
  settings: ISettingsState;
  transactions: ITransactionsState;
}
