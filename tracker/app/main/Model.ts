import { RouterState } from 'react-router-redux';

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
  isSaving: boolean;
  /** ms since the epoch */
  lastUpdated: number;

  settings: ISettings;
}

export interface IAppState {
  routing: RouterState;
  settings: ISettingsState;
}
