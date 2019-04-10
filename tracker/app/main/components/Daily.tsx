import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import memoize from 'memoize-one';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { ITransaction, Transaction, TransactionsActions, TransactionsTable, TransactionUtils } from '../../transactions';
import { fetchSettingsFromDropboxIfNeeded } from '../actions';
import { IAppState, ISpendTarget } from '../Model';
import DailyGraph from './DailyGraph';
import MenuBar from './MenuBar';

const styles = (theme: Theme) => createStyles({
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
    spendTarget?: ISpendTarget) => ITransaction[];

interface IDailyOwnProps extends WithStyles<typeof styles> {
}
interface IDailyAppStateProps {
  transactions: ITransaction[];
  spendTargets: ISpendTarget[];
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
class extends React.Component<IDailyProps, IDailyState> {
  constructor(props: IDailyProps, context?: any) {
    super(props, context);

    this.state = {};
    this.props.fetchTransactions();
    this.props.fetchSettings();
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let spendTarget = this.props.spendTargets.length > 0
        ? this.props.spendTargets[0]
        : undefined;
    let filteredTransactions = this.filterTransactions(
        this.props.transactions, spendTarget);
    let rows = filteredTransactions.map(t => {
        return (
          <Transaction transaction={t} key={t.id}/>
        );
      });

    return (
      <div className={classes.root}>
        <MenuBar title='Daily'/>

        <DailyGraph
          graph_id='daily-spend-chart'
          transactions={filteredTransactions}
          onClickDate={this.scrollDateIntoView}
          spendTarget={spendTarget}
          />

        <TransactionsTable
            classes={{root: classes.transactionsTable}}
            lazyRender
            scrollToRow={this.state.scrollToRow}>
          {rows}
        </TransactionsTable>
      </div>
    );
  }

  public scrollDateIntoView = (date: Date): void => {
    let spendTarget = this.props.spendTargets.length > 0
        ? this.props.spendTargets[0]
        : undefined;
    if (!spendTarget) {
      return;
    }
    let filteredTransactions = this.filterTransactions(
        this.props.transactions, spendTarget);

    for (let rowNum = 0; rowNum < filteredTransactions.length; ++rowNum) {
      let t = filteredTransactions[rowNum];
      if (moment(t.date).isSameOrBefore(date)) {
        this.setState({
          scrollToRow: rowNum,
        });
        break;
      }
    }
  }

  // tslint:disable-next-line:member-ordering (this is a function, not a field)
  private filterTransactions: filterTransactionsFunction = memoize<filterTransactionsFunction>(
      (transactions, spendTarget?) => {
          if (transactions.length == 0 || !spendTarget) {
            return [];
          }

          let startDate = moment(spendTarget.startDate).toDate();
          let endDate = spendTarget.endDate
              ? moment(spendTarget.endDate).toDate()
              : moment(this.props.transactions[0].date).toDate();
          return TransactionUtils.filterTransactions(
              transactions,
              {
                startDate,
                endDate,
                tagsIncludeAny: spendTarget && spendTarget.tags.include,
                tagsExcludeAny: spendTarget && spendTarget.tags.exclude,
              },
          );
      },
  );
});

const mapStateToProps = (state: IAppState): IDailyAppStateProps => ({
  transactions: state.transactions.transactions,
  spendTargets: state.settings.settings.spendTargets,
});
const mapDispatchToProps = (dispatch: ThunkDispatch<IAppState, null, any>): IDailyDispatchProps => ({
  fetchTransactions: () => {
    dispatch(TransactionsActions.fetchTransactionsFromDropboxIfNeeded());
  },
  fetchSettings: () => {
    dispatch(fetchSettingsFromDropboxIfNeeded());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Daily);
