import { createStyles, Tab, Tabs, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import {
  ITransaction,
  Transaction,
  TransactionsTable,
} from '../../transactions';

const styles = (_theme: Theme) =>
  createStyles({
    renderedTree: {
      margin: '16px',
      '& > .row': {
        lineHeight: '24px',
        borderRadius: '4px',
        margin: '4px',
        backgroundColor: 'rgba(0, 0, 0, .08)',
      },
      '& > .row .amount': {
        display: 'inline-block',
        whiteSpace: 'nowrap',
        textAlign: 'right',
        marginRight: '16px',
        width: '90px',
      },
      '& > .total': {
        color: 'rgba(0, 0, 0, .3)',
      },
      '& > .info': {
        color: 'rgba(0, 0, 0, .3)',
        fontSize: 'small',
      },
    },
    transactionsTable: {
      borderTop: '1px solid lightgrey',
    },
    tables: {
      overflow: 'auto',
      flex: '1 1 0',
    },
    tabs: {
      backgroundColor: '#eee',
    },
  });

export interface IReportTabData {
  columnName: string;
  renderedTree: JSX.Element;
  unmatchedTransactions: ITransaction[];
}

interface IReportTabsProps extends WithStyles<typeof styles> {
  tabData: IReportTabData;
  compareTabData?: IReportTabData;
}
interface IReportTabsState {
  tabIndex: number;
}
export const ReportTabs = withStyles(styles)(
  class Component extends React.PureComponent<
    IReportTabsProps,
    IReportTabsState
  > {
    constructor(props: IReportTabsProps) {
      super(props);
      this.state = {
        tabIndex: 0,
      };
    }

    public render(): React.ReactElement<Record<string, unknown>> {
      let startTime = window.performance.now();
      let classes = this.props.classes;
      let tabs: JSX.Element[] = [];
      let tabContents: JSX.Element[] = [];
      this.buildContent(this.props.tabData, tabs, tabContents);

      if (this.props.compareTabData) {
        this.buildContent(this.props.compareTabData, tabs, tabContents);
      }

      console.debug(
        `${window.performance.now() - startTime} ReportTabs render()`
      );
      return (
        <React.Fragment>
          <Tabs
            className={classes.tabs}
            value={this.state.tabIndex}
            onChange={(
              _event: React.ChangeEvent<unknown>,
              tabIndex: number
            ) => {
              this.setState({ tabIndex });
            }}
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
          >
            {tabs}
          </Tabs>

          <div className={classes.tables}>{tabContents}</div>
        </React.Fragment>
      );
    }

    private buildContent(
      tabData: IReportTabData,
      tabs: JSX.Element[],
      tabContents: JSX.Element[]
    ) {
      let classes = this.props.classes;
      let columnName = tabData.columnName;
      tabs.push(
        <Tab
          key={`tab-${columnName}-cat`}
          label={`${columnName} Categories`}
        />,
        <Tab
          key={`tab-${columnName}-uncat`}
          label={`${columnName} Uncategorized`}
        />
      );

      let tabIndex = tabContents.length;
      tabContents.push(
        <div
          key={`tree-${columnName}`}
          className={classes.renderedTree}
          hidden={this.state.tabIndex != tabIndex}
        >
          {tabData.renderedTree}
        </div>,
        <TransactionsTable
          key={`table-${columnName}`}
          classes={{ root: classes.transactionsTable }}
          hidden={this.state.tabIndex != tabIndex + 1}
          // TODO: Fix lazyRender for these table contents.
          // lazyRender
        >
          {tabData.unmatchedTransactions.map(t => (
            <Transaction transaction={t} key={t.id} />
          ))}
        </TransactionsTable>
      );
    }
  }
);

export default ReportTabs;
