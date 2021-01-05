import { createStyles, Drawer, Hidden, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
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
import ReportTabs from './ReportTabs';

const LOADING_TEXT = 'loading...';

const styles = (_theme: Theme) =>
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
      // Disable the transition because it causes the chart to be
      // incorrectly sized (the chart only resizes once at the first
      // frame of the animation).
      // transition: theme.transitions.create('width', {
      //   easing: theme.transitions.easing.easeOut,
      //   duration: theme.transitions.duration.enteringScreen,
      // }),
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
        console.debug(`${startTime} Report start`);
        let classes = this.props.classes;
        let filteredTransactions = TransactionUtils.filterTransactionsByDate(
            this.props.transactions,
            this.state.dateRange.startDate.toDate(),
            this.state.dateRange.endDate.toDate()
        );
        console.debug(`${window.performance.now() - startTime}   filtered`);

        let [unmatchedTransactions, renderedTree, chartNodes] = this.buildTree(
            filteredTransactions
        );
        console.debug(
            `${window.performance.now() - startTime}   tree built ${
              unmatchedTransactions.length
            }`
        );

        let compareTabData;
        let compareChartNodes: IChartNode[] = [];
        if (this.state.compareDateRange) {
          let compareUnmatchedTransactions;
          let compareRenderTree;
          filteredTransactions = TransactionUtils.filterTransactionsByDate(
              this.props.transactions,
              this.state.compareDateRange.startDate.toDate(),
              this.state.compareDateRange.endDate.toDate()
          );
          [
            compareUnmatchedTransactions,
            compareRenderTree,
            compareChartNodes,
          ] = this.buildTree(filteredTransactions);
          compareTabData = {
            columnName: this.state.compareDateRange.chartColumnName,
            renderedTree: compareRenderTree,
            unmatchedTransactions: compareUnmatchedTransactions,
          };
        }

        let chartData = this.buildChartDataTable(chartNodes, compareChartNodes);

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
              let reportCategories = new Map(this.props.reportCategories);
              reportCategories.set(this.state.selectedReportName, categories);
              this.props.updateReportCategories(reportCategories);
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
        console.debug(`${window.performance.now() - startTime} Report end`);
        return (
          <div className={classes.root}>
            <ReportMenuBar
              onFilterClick={() =>
                this.setState({
                  isFilterDrawerOpen: !this.state.isFilterDrawerOpen,
                })
              }
            />

            <div className={classes.contentAndDrawerContainer}>
              <div className={classes.content}>
                <ReportChart chartData={chartData} />

                <ReportTabs
                  key={`${this.state.dateRange.chartColumnName}-${
                    compareTabData ? compareTabData.columnName : 'none'
                  }`}
                  tabData={{
                    columnName: this.state.dateRange.chartColumnName,
                    renderedTree: renderedTree,
                    unmatchedTransactions: unmatchedTransactions,
                  }}
                  compareTabData={compareTabData}
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

      // Builds the tree to be rendered.
      private buildTree = (
          transactions: ITransaction[]
      ): [ITransaction[], JSX.Element, IChartNode[]] => {
        if (!this.props.reportCategories) {
          return [[], <div key="loading">Loading...</div>, []];
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
        let reportRenderNodes = buildRenderTree(
            this.props.reportCategories.get(this.state.selectedReportName) || []
        );

        let tagToRootReportRenderNode: Map<string, ReportRenderNode> = new Map();
        for (let renderNode of reportRenderNodes) {
          if (!renderNode.reportNode.tags) {
            continue;
          }
          for (let tag of renderNode.reportNode.tags) {
            const reportRenderNode = tagToRootReportRenderNode.get(tag);
            if (reportRenderNode) {
              return [
                [],
                <div key="msg">
                Error, tag appears twice.
                  {tag} in {reportRenderNode.reportNode.title}
                and {renderNode.reportNode.title}.
                </div>,
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
                  {renderNode.reportNode.title} from{' '}
                  {renderNode.transactions.length} transaction(s)
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
          unmatchedTransactions,
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
          </React.Fragment>,
          outputChartData,
        ];
      };

      private buildChartDataTable = (
          chartData: IChartNode[],
          compareChartData: IChartNode[]
      ) => {
      type DataCell = string | number;
      type DataRow = [DataCell, DataCell, DataCell?];
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
      };
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
