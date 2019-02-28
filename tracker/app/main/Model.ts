import { RouterState } from 'react-router-redux';

export interface IAppState {
  routing: RouterState;
}

export interface IReportNode {
  title: string;
  tags: string[];
  subcategories: IReportNode[];
}
