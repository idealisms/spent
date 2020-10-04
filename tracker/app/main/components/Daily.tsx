import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import memoize from 'memoize-one';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import {
  ITransaction,
  Transaction,
  TransactionsActions,
  TransactionsTable,
  TransactionUtils,
} from '../../transactions';
import { fetchSettingsFromDropboxIfNeeded } from '../actions';
import { IAppState, IDailySpendTarget } from '../Model';
import DailyGraph from './DailyGraph';
import MenuBarWithDrawer from './MenuBarWithDrawer';

const styles = (_theme: Theme) =>
  createStyles({
    root: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    transactionsTable: {
      flex: 1,
      overflow: 'auto',
      borderTop: '1px solid lightgrey',
    },
  });

type filterTransactionsFunction = (
  transactions: ITransaction[],
  spendTarget: IDailySpendTarget
) => ITransaction[];

interface IDailyOwnProps extends WithStyles<typeof styles> {}
interface IDailyAppStateProps {
  transactions: ITransaction[];
  dailySpendTarget: IDailySpendTarget;
}
interface IDailyDispatchProps {
  fetchTransactions: () => void;
  fetchSettings: () => void;
}
type IDailyProps = IDailyOwnProps & IDailyAppStateProps & IDailyDispatchProps;
interface IDailyState {
  scrollToRow?: number;
}

const Daily = withStyles(styles)(
    class Component extends React.Component<IDailyProps, IDailyState> {
      constructor(props: IDailyProps) {
        super(props);

        this.state = {};
        this.props.fetchTransactions();
        this.props.fetchSettings();
      }

      public render(): React.ReactElement<Record<string, unknown>> {
        let classes = this.props.classes;
        let filteredTransactions = this.filterTransactions(
            this.props.transactions,
            this.props.dailySpendTarget
        );
        let rows = filteredTransactions.map(t => {
          return <Transaction transaction={t} key={t.id} />;
        });

        return (
          <div className={classes.root}>
            <MenuBarWithDrawer title="Daily" />

            <DailyGraph
              graph_id="daily-spend-chart"
              transactions={filteredTransactions}
              onClickDate={this.scrollDateIntoView}
              spendTarget={this.props.dailySpendTarget}
            />

            <TransactionsTable
              classes={{ root: classes.transactionsTable }}
              lazyRender
              scrollToRow={this.state.scrollToRow}
            >
              {rows}
            </TransactionsTable>
          </div>
        );
      }

      public scrollDateIntoView = (date: Date): void => {
        let filteredTransactions = this.filterTransactions(
            this.props.transactions,
            this.props.dailySpendTarget
        );

        for (let rowNum = 0; rowNum < filteredTransactions.length; ++rowNum) {
          let t = filteredTransactions[rowNum];
          if (moment(t.date).isSameOrBefore(date)) {
            this.setState({
              scrollToRow: rowNum,
            });
            break;
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/member-ordering
      private filterTransactions: filterTransactionsFunction = memoize<
      filterTransactionsFunction
      >((transactions, spendTarget) => {
        if (!transactions.length || !spendTarget.targets.length) {
          return [];
        }

        let startDate = moment(spendTarget.targets[0].startDate).toDate();
        let endDate = moment(this.props.transactions[0].date).toDate();
        return TransactionUtils.filterTransactions(transactions, {
          startDate,
          endDate,
          tagsIncludeAny: spendTarget && spendTarget.tags.include,
          tagsExcludeAny: spendTarget && spendTarget.tags.exclude,
        });
      });
    }
);

const mapStateToProps = (state: IAppState): IDailyAppStateProps => ({
  transactions: state.transactions.transactions,
  dailySpendTarget: state.settings.settings.dailySpendTarget,
});
const mapDispatchToProps = (
    dispatch: ThunkDispatch<IAppState, null, any>
): IDailyDispatchProps => ({
  fetchTransactions: () => {
    dispatch(TransactionsActions.fetchTransactionsFromDropboxIfNeeded());
  },
  fetchSettings: () => {
    dispatch(fetchSettingsFromDropboxIfNeeded());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Daily);
