import { RouterState } from 'connected-react-router';
import { ITransactionsState } from '../transactions';
import { IAuthState } from '../auth/Model';

export enum CloudState {
  Done = 1,
  Modified = 2,
  Uploading = 3,
}

/**
 * Used on the report page for making annual reports.
 *
 * Each ReportNode is a category of transaction types.
 */
export interface IReportNode {
  title: string;
  /** Transaction is included if it has any of these tags. */
  tags: string[];
  subcategories: IReportNode[];
}

/**
 * Used on the report page for rendering a chart.
 */
export interface IChartNode {
  title: string;
  amount_cents: number;
  subcategories: IChartNode[];
}

export interface IDailySpendTarget {
  startBalanceCents: number;
  targets: {
    targetAnnualCents: number;
    /** YYYY-MM-DD */
    startDate: string;
  }[];

  tags: {
    /** A transaction is included if it has any of these tags. */
    include: string[];
    /** A transaction is excluded if it has any of these tags. */
    exclude: string[];
  };
  /** Optional field for arbitrary notes. */
  notes?: string;
}

/**
 * Used to track a spending target.
 *
 * For example, can be used to track a total budget,
 * or perhaps a more specific budget like healthcare
 * or eating out.
 */
export interface ISpendTarget {
  name: string;
  targetAnnualCents: number;
  startBalanceCents: number;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD
   *  If not specified, continue until the present day.
   */
  endDate?: string;
  tags: {
    /** A transaction is included if it has any of these tags. */
    include: string[];
    /** A transaction is excluded if it has any of these tags. */
    exclude: string[];
  };
  /** Optional field for arbitrary notes. */
  notes?: string;
}

export interface ISettings {
  reportCategories: IReportNode[];
  dailySpendTarget: IDailySpendTarget;
  /** These are shown on the Monthly page. */
  spendTargets: ISpendTarget[];
}

export interface ISettingsState {
  /** ms since the epoch */
  lastUpdated: number;
  cloudState: CloudState;

  settings: ISettings;
}

export interface IAppState {
  router: RouterState;
  auth: IAuthState;
  settings: ISettingsState;
  transactions: ITransactionsState;
}
