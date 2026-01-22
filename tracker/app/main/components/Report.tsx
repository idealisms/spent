import { createStyles, Drawer, Hidden as MuiHidden, WithStyles } from '@material-ui/core';

// MUI 4 Hidden doesn't have proper children types for React 18
const Hidden = MuiHidden as React.ComponentType<any>;
import { Theme, withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import memoize from 'memoize-one';
import {
  Category,
  ITransaction,
  TAG_TO_CATEGORY,
  TransactionUtils,
} from '../../transactions';
import { saveSettingsToDropbox, updateSetting } from '../actions';
import { CloudState, IAppState, IChartNode, IReportNode } from '../model';
import ReportChart from './ReportChart';
import { IDateRange, ReportFilterDrawer } from './ReportFilterDrawer';
import ReportMenuBar from './ReportMenuBar';
import { IReportTabData, ReportTabs } from './ReportTabs';

const LOADING_TEXT = 'loading...';
const EMPTY_ARRAY: IChartNode[] = [];

const styles = (theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    contentAndDrawerContainer: {
      display: 'flex',
      flexGrow: 1,
      overflow: 'auto',
      alignItems: 'stretch',
    },
    content: {
      width: 'calc(100% - 420px)',
      flex: '0 1 100%',
      display: 'flex',
      flexDirection: 'column',
    },
    drawer: {
      width: 0,
      flexShrink: 0,
      overflow: 'hidden auto',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      '&.open': {
        width: '420px',
      },
    },
    drawerContentsContainer: {
      width: '419px',
      borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
    },
    drawerPaper: {
      width: '90%',
      maxWidth: '420px',
      minWidth: '16px',
    },
  });
type ReportRenderNode = {
  reportNode: IReportNode;
  amountCents: number;
  transactions: ITransaction[];
  subcategories: ReportRenderNode[];
};

type DataCell = string | number;
type DataRow = [DataCell, DataCell, DataCell?];
type buildChartDataTableFunction = (
  chartData: IChartNode[],
  compareChartData: IChartNode[]
) => DataRow[];

class ReportData {
  private transactions: ITransaction[];
  private columnName: string;

  private tabData?: IReportTabData;
  private chartNodes?: IChartNode[];

  constructor(
    private allTransactions: ITransaction[],
    private dateRange: IDateRange,
    private reportCategories: IReportNode[]
  ) {
    this.transactions = TransactionUtils.filterTransactionsByDate(
      allTransactions,
      dateRange.startDate.toDate(),
      dateRange.endDate.toDate()
    );
    this.columnName = dateRange.chartColumnName;
  }

  public getTabData(): IReportTabData {
    if (this.tabData == undefined) {
      [this.tabData, this.chartNodes] = this.buildTree(
        this.transactions,
        this.reportCategories
      );
      this.tabData.columnName = this.columnName;
    }
    return this.tabData;
  }

  public getChartNodes(): IChartNode[] {
    if (this.chartNodes == undefined) {
      [this.tabData, this.chartNodes] = this.buildTree(
        this.transactions,
        this.reportCategories
      );
      this.tabData.columnName = this.columnName;
    }
    return this.chartNodes;
  }

  public cacheKeyEquals(
    allTransactions: ITransaction[],
    dateRange: IDateRange,
    reportCategories: IReportNode[]
  ) {
    // console.log('cacheKeyEquals',
    //     allTransactions == this.allTransactions,
    //     dateRange == this.dateRange,
    //     reportCategories == this.reportCategories);
    return (
      allTransactions == this.allTransactions &&
      dateRange == this.dateRange &&
      reportCategories == this.reportCategories
    );
  }

  private buildTree(
    transactions: ITransaction[],
    reportCategories: IReportNode[]
  ): [IReportTabData, IChartNode[]] {
    if (reportCategories.length == 0) {
      return [
        {
          columnName: '',
          renderedTree: <div key="loading">Loading...</div>,
          unmatchedTransactions: [],
        },
        [],
      ];
    }

    let startTime = window.performance.now();
    let output: JSX.Element[] = [];
    const buildRenderTree = (
      reportNodes: IReportNode[]
    ): ReportRenderNode[] => {
      reportNodes = reportNodes || [];
      let renderNodes: ReportRenderNode[] = [];
      for (let reportNode of reportNodes) {
        let reportRenderNode: ReportRenderNode = {
          reportNode: reportNode,
          amountCents: 0,
          transactions: [],
          subcategories: buildRenderTree(reportNode.subcategories),
        };
        renderNodes.push(reportRenderNode);
      }
      return renderNodes;
    };
    let reportRenderNodes = buildRenderTree(reportCategories);

    let tagToRootReportRenderNode: Map<string, ReportRenderNode> = new Map();
    for (let renderNode of reportRenderNodes) {
      if (!renderNode.reportNode.tags) {
        continue;
      }
      for (let tag of renderNode.reportNode.tags) {
        const reportRenderNode = tagToRootReportRenderNode.get(tag);
        if (reportRenderNode) {
          return [
            {
              columnName: '',
              renderedTree: (
                <div key="msg">
                  Error, tag appears twice.
                  {tag} in {reportRenderNode.reportNode.title}
                  and {renderNode.reportNode.title}.
                </div>
              ),
              unmatchedTransactions: [],
            },
            [],
          ];
        }
        tagToRootReportRenderNode.set(tag, renderNode);
      }
    }

    const addTransactionToRenderNode = (
      transaction: ITransaction,
      node: ReportRenderNode
    ): void => {
      node.transactions.push(transaction);
      node.amountCents += transaction.amount_cents;
      let subnodes = [];
      for (let subnode of node.subcategories) {
        if (!subnode.reportNode.tags) {
          continue;
        }
        for (let tag of subnode.reportNode.tags) {
          if (transaction.tags.indexOf(tag) != -1) {
            subnodes.push(subnode);
            break;
          }
        }
      }
      if (subnodes.length > 1) {
        output.push(
          <div key={transaction.id}>
            Multiple subnodes of {node.reportNode.title}:{' '}
            {transaction.description} ({transaction.tags.join(', ')})
          </div>
        );
      } else if (subnodes.length == 1) {
        addTransactionToRenderNode(transaction, subnodes[0]);
      }
    };

    let unmatchedTransactions: ITransaction[] = [];
    let multipleCategoriesTransactions: ITransaction[] = [];
    for (let transaction of transactions) {
      let renderNodes = [];
      for (let tag of transaction.tags) {
        let node = tagToRootReportRenderNode.get(tag);
        if (node && renderNodes.indexOf(node) == -1) {
          renderNodes.push(node);
        }
      }
      if (!renderNodes.length) {
        unmatchedTransactions.push(transaction);
      } else if (renderNodes.length > 1) {
        multipleCategoriesTransactions.push(transaction);
      } else {
        addTransactionToRenderNode(transaction, renderNodes[0]);
      }
    }

    // console.log(ReportRenderNodes);

    let buildTime = window.performance.now();
    let outputChartData: IChartNode[] = [];
    const buildDom = (
      renderNodes: ReportRenderNode[],
      depth: number,
      outputDom: JSX.Element[],
      chartData: IChartNode[]
    ): void => {
      renderNodes.sort((lhs, rhs) => {
        if (lhs.amountCents == rhs.amountCents) {
          return 0;
        }
        return lhs.amountCents > rhs.amountCents ? -1 : 1;
      });
      for (let renderNode of renderNodes) {
        outputDom.push(
          <div
            key={`${renderNode.reportNode.title}-${renderNode.amountCents}`}
            className="row"
            style={{ marginLeft: depth * 32 + 'px' }}
          >
            <span className="amount">
              ${TransactionUtils.formatAmountNumber(renderNode.amountCents)}
            </span>
            {renderNode.reportNode.title} from {renderNode.transactions.length}{' '}
            transaction(s)
          </div>
        );
        let chartDatum = {
          title: renderNode.reportNode.title,
          amount_cents: renderNode.amountCents,
          subcategories: [],
        };
        chartData.push(chartDatum);
        buildDom(
          renderNode.subcategories,
          depth + 1,
          outputDom,
          chartDatum.subcategories
        );
      }
    };
    buildDom(reportRenderNodes, 0, output, outputChartData);

    let total = 0;
    for (let chartData of outputChartData) {
      total += chartData.amount_cents;
    }

    let domTime = window.performance.now();
    return [
      {
        columnName: '',
        renderedTree: (
          <React.Fragment key="msg">
            <div className="total">
              ${TransactionUtils.formatAmountNumber(total)}
            </div>
            {output}
            <div className="info">
              Build time: {(buildTime - startTime).toFixed(2)}ms
            </div>
            <div className="info">
              DOM time: {(domTime - buildTime).toFixed(2)}ms
            </div>
          </React.Fragment>
        ),
        unmatchedTransactions,
      },
      outputChartData,
    ];
  }
}

interface IReportOwnProps extends WithStyles<typeof styles> {}
interface IReportAppStateProps {
  reportCategories: Map<string, IReportNode[]>;
  settingsCloudState: CloudState;
  transactions: ITransaction[];
}
interface IReportDispatchProps {
  updateReportCategories: (categories: Map<string, IReportNode[]>) => void;
  saveSettings: () => void;
}
type IReportProps = IReportOwnProps &
  IReportAppStateProps &
  IReportDispatchProps;
interface IReportState {
  dateRange: IDateRange;
  compareDateRange?: IDateRange;
  tabIndex: number;
  selectedReportName: string;
  categoriesPretty: string;
  isFilterDrawerOpen: boolean;
}
const Report = withStyles(styles)(
  class Component extends React.Component<IReportProps, IReportState> {
    /** LRU cache of report data. Old items are at the front of the Array. */
    private reportDataCache: Array<ReportData>;

    constructor(props: IReportProps) {
      super(props);
      let startDate = moment()
        .year(moment().year() - 1)
        .month(0)
        .date(1)
        .startOf('day');
      let endDate = moment()
        .year(moment().year() - 1)
        .month(11)
        .date(31)
        .startOf('day');

      let reportName = this.props.reportCategories.keys().next().value || '';
      let reportCategories = this.props.reportCategories.get(reportName) || [];

      this.state = {
        dateRange: {
          name: 'lastyear',
          chartColumnName: endDate.year().toString(),
          startDate,
          endDate,
        },
        tabIndex: 0,
        selectedReportName: reportName,
        categoriesPretty: reportCategories.length
          ? JSON.stringify(reportCategories, null, 2)
          : LOADING_TEXT,
        isFilterDrawerOpen: false,
      };

      this.reportDataCache = [];
    }

    public componentDidUpdate(_prevProps: IReportProps): void {
      // Update the editable textarea once settings load.
      if (
        this.state.categoriesPretty == LOADING_TEXT &&
        this.props.reportCategories
      ) {
        let reportCategories =
          this.props.reportCategories.get(this.state.selectedReportName) || [];
        this.setState({
          categoriesPretty: JSON.stringify(reportCategories, null, 2),
        });
      }
    }

    public render(): React.ReactElement<Record<string, unknown>> {
      let startTime = window.performance.now();
      let classes = this.props.classes;
      // TODO: Handle more reports. Currently we just grab the first on in the map.
      let reportName = this.props.reportCategories.keys().next().value || '';
      let reportCategories = this.props.reportCategories.get(reportName) || [];

      let reportData = this.reportDataFactory(
        this.state.dateRange,
        reportCategories
      );
      let compareReportData =
        this.state.compareDateRange &&
        this.reportDataFactory(this.state.compareDateRange, reportCategories);

      let chartData = this.buildChartDataTable(
        reportData.getChartNodes(),
        compareReportData ? compareReportData.getChartNodes() : EMPTY_ARRAY
      );

      let drawerContents = (
        <ReportFilterDrawer
          dateRange={this.state.dateRange}
          compareDateRange={this.state.compareDateRange}
          settingsCloudState={this.props.settingsCloudState}
          saveSettings={this.props.saveSettings}
          categoriesPretty={this.state.categoriesPretty}
          reportNames={Array.from(this.props.reportCategories.keys())}
          selectedReportName={this.state.selectedReportName}
          updateReportCategories={categories => {
            let reportCategoriesCopy = new Map(this.props.reportCategories);
            reportCategoriesCopy.set(this.state.selectedReportName, categories);
            this.props.updateReportCategories(reportCategoriesCopy);
          }}
          setDate={(dateRange, compareDateRange) => {
            let tabIndex =
              !compareDateRange && this.state.tabIndex >= 2
                ? 0
                : this.state.tabIndex;
            this.setState({
              dateRange,
              compareDateRange,
              tabIndex,
            });
          }}
          setCategoriesPretty={categoriesPretty =>
            this.setState({ categoriesPretty })
          }
        />
      );
      console.debug(`${window.performance.now() - startTime} Report render()`);

      return (
        <div className={classes.root}>
          <ReportMenuBar
            onFilterClick={() => {
              this.setState({
                isFilterDrawerOpen: !this.state.isFilterDrawerOpen,
              });
            }}
          />

          <div className={classes.contentAndDrawerContainer}>
            <div className={classes.content}>
              <ReportChart chartData={chartData} />

              <ReportTabs
                tabData={reportData.getTabData()}
                compareTabData={
                  compareReportData && compareReportData.getTabData()
                }
              />
            </div>
            <Hidden smUp>
              {/* Use a standard <Drawer> here for mobile. */}
              <Drawer
                anchor="right"
                classes={{ paper: classes.drawerPaper }}
                open={this.state.isFilterDrawerOpen}
                onClose={() => this.setState({ isFilterDrawerOpen: false })}
              >
                {drawerContents}
              </Drawer>
            </Hidden>
            <Hidden xsDown>
              <div
                className={classNames(
                  classes.drawer,
                  this.state.isFilterDrawerOpen && 'open'
                )}
              >
                <div className={classes.drawerContentsContainer}>
                  {drawerContents}
                </div>
              </div>
            </Hidden>
          </div>
        </div>
      );
    }

    private reportDataFactory(
      dateRange: IDateRange,
      reportCategories: IReportNode[]
    ): ReportData {
      const CACHE_SIZE = 2;
      for (let i = this.reportDataCache.length - 1; i >= 0; --i) {
        let reportData = this.reportDataCache[i];
        if (
          reportData.cacheKeyEquals(
            this.props.transactions,
            dateRange,
            reportCategories
          )
        ) {
          // We have a match! Make sure to move the most recent item to the back of the Array.
          this.reportDataCache.splice(i, 1);
          this.reportDataCache.push(reportData);
          return reportData;
        }
      }

      let reportData = new ReportData(
        this.props.transactions,
        dateRange,
        reportCategories
      );
      this.reportDataCache.push(reportData);
      while (this.reportDataCache.length > CACHE_SIZE) {
        this.reportDataCache.shift();
      }
      return reportData;
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    private buildChartDataTable: buildChartDataTableFunction =
      memoize<buildChartDataTableFunction>((chartData, compareChartData) => {
        let data: DataRow[] = [];
        data.push(['Category', this.state.dateRange.chartColumnName]);
        for (let chartNode of chartData) {
          if (chartNode.amount_cents <= 0) {
            continue;
          }
          data.push([chartNode.title, chartNode.amount_cents / 100.0]);
        }

        if (this.state.compareDateRange) {
          let columnTitle = this.state.compareDateRange.chartColumnName;
          let compareMap: Map<string, number> = new Map();
          compareChartData.forEach(chartNode => {
            if (chartNode.amount_cents > 0) {
              compareMap.set(chartNode.title, chartNode.amount_cents);
            }
          });
          data.forEach((dataRow, index) => {
            if (index == 0) {
              dataRow.push(columnTitle);
            } else {
              let category = dataRow[0] as string;
              let amountCents = compareMap.get(category) || 0;
              dataRow.push(amountCents / 100);
              compareMap.delete(category);
            }
          });
          // If there are categories in the compare data that wasn't in the base
          // data, add entries for those at the end.
          if (compareMap.size > 0) {
            for (let chartNode of compareChartData) {
              if (compareMap.has(chartNode.title)) {
                data.push([chartNode.title, 0, chartNode.amount_cents / 100]);
              }
            }
          }
        }

        return data;
      });
  }
);

const mapStateToProps = (state: IAppState): IReportAppStateProps => ({
  reportCategories: state.settings.settings.reportCategories as Map<
    string,
    IReportNode[]
  >,
  settingsCloudState: state.settings.cloudState,
  transactions: state.transactions.transactions,
});
const mapDispatchToProps = (
  dispatch: ThunkDispatch<IAppState, null, any>
): IReportDispatchProps => ({
  updateReportCategories: categories => {
    dispatch(updateSetting('reportCategories', categories));
  },
  saveSettings: () => {
    dispatch(saveSettingsToDropbox());
  },
});
export default connect(mapStateToProps, mapDispatchToProps)(Report);

export const getDefaultCategories = (): IReportNode[] => {
  let lookup = new Map<string, IReportNode>();
  TAG_TO_CATEGORY.forEach((category, tag) => {
    let categoryName = Category[category];
    let node = lookup.get(categoryName) || {
      title: categoryName,
      tags: [],
      subcategories: [],
    };
    node.tags.push(tag);
    lookup.set(categoryName, node);
  });
  let categories: IReportNode[] = [];
  lookup.forEach(node => categories.push(node));
  return categories;
};
