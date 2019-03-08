import { createStyles, WithStyles } from '@material-ui/core';
import MenuItem from '@material-ui/core/MenuItem';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import Select from '@material-ui/core/Select';
import { Theme, withStyles } from '@material-ui/core/styles';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
// tslint:disable-next-line:max-line-length
import { ITransaction, Transaction, TransactionsActions, TransactionsTable, TransactionsTableSumRow, TransactionUtils } from '../../transactions';
import { fetchSettingsFromDropboxIfNeeded } from '../actions';
import { IAppState, ISpendTarget } from '../Model';
import MenuBar from './MenuBar';

const styles = (theme: Theme) => createStyles({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  controls: {
    flex: 'none',
    margin: '16px',
  },
  transactionsTable: {
    flex: 1,
    overflow: 'auto',
    borderTop: '1px solid lightgrey',
  },
});
interface IMonthlyOwnProps extends WithStyles<typeof styles> {
}
interface IMonthlyAppStateProps {
  transactions: ITransaction[];
  spendTargets: ISpendTarget[];
}
interface IMonthlyDispatchProps {
  fetchTransactions: () => void;
  fetchSettings: () => void;
}
type IMonthlyProps = IMonthlyOwnProps & IMonthlyAppStateProps & IMonthlyDispatchProps;
interface IMonthlyState {
  spendTargetIndex: number;
}

const Monthly = withStyles(styles)(
class extends React.Component<IMonthlyProps, IMonthlyState> {
  constructor(props: IMonthlyProps, context?: any) {
    super(props, context);
    let spendTargetIndex = 0;
    this.state = {
      spendTargetIndex,
    };
    this.props.fetchTransactions();
    this.props.fetchSettings();
  }

  public componentDidUpdate(prevProps: IMonthlyProps): void {
    if (this.props.spendTargets !== prevProps.spendTargets && this.props.spendTargets.length) {
      this.updateSpendTarget(0);
    }
    if (this.props.transactions !== prevProps.transactions) {
      this.updateSpendTarget(this.state.spendTargetIndex);
    }
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let spendTarget = this.props.spendTargets.length > 0
        ? this.props.spendTargets[this.state.spendTargetIndex]
        : undefined;
    let startDate = spendTarget
        ? moment(spendTarget.startDate).toDate()
        : moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate();
    let endDate = spendTarget
        ? moment(spendTarget.endDate).toDate()
        : moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate();
    let filteredTransactions = TransactionUtils.filterTransactions(
        this.props.transactions,
        {
          startDate,
          endDate,
          tagsIncludeAny: spendTarget && spendTarget.tags.include,
          tagsExcludeAny: spendTarget && spendTarget.tags.exclude,
        });
    let rows = this.groupByMonths(filteredTransactions);

    return (
      <div className={classes.root}>
        <MenuBar title='Monthly'/>

        {/* <MonthlyGraph
          graph_id='daily-spend-chart'
          transactions={filteredTransactions}
          startDate={this.state.startDate}
          endDate={this.state.endDate}
          dailyBudgetCents={this.state.dailyBudgetCents}
          startBalanceCents={spendTarget ? spendTarget.startBalanceCents : 0}
          /> */}

        <div className={classes.controls}>
          <Select
            value={this.props.spendTargets[this.state.spendTargetIndex]
                ? this.props.spendTargets[this.state.spendTargetIndex].name
                : ''}
            onChange={this.handleSelectSpendTarget}
            input={
              <OutlinedInput
                labelWidth={0}
                margin='dense'
                name='Target' />}
          >
            {this.props.spendTargets.map(target => (
              <MenuItem value={target.name} key={target.name}>
                {target.name}
              </MenuItem>
            ))}
          </Select>
        </div>
        <TransactionsTable
            classes={{root: classes.transactionsTable}}
            lazyRender>
          {rows}
        </TransactionsTable>
      </div>
    );
  }

  public handleSelectSpendTarget = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    let spendTargetName = event.target.value;
    for (let i = 0; i < this.props.spendTargets.length; ++i) {
      if (this.props.spendTargets[i].name == spendTargetName) {
        this.updateSpendTarget(i);
        break;
      }
    }
  }

  private updateSpendTarget = (spendTargetIndex: number): void => {
    this.setState({
      spendTargetIndex,
    });
  }

  private groupByMonths = (transactions: ITransaction[]): JSX.Element[] => {
    let rows: JSX.Element[] = [];

    let monthMap: Map<string, ITransaction[]> = new Map;
    transactions.forEach(t => {
      let month = moment(t.date).format('YYYY-MM');
      let arr = monthMap.get(month);
      if (arr) {
        arr.push(t);
      } else {
        monthMap.set(month, [t]);
      }
    });

    let lastMonth = '';
    let lastMonthTransactions: ITransaction[] | undefined;
    for (let t of transactions) {
      let month = moment(t.date).format('YYYY-MM');
      if (lastMonth != month) {
        lastMonthTransactions = monthMap.get(lastMonth);
        if (lastMonthTransactions) {
          rows.push(<TransactionsTableSumRow transactions={lastMonthTransactions} />);
        }
        let headerText = moment(t.date).format('MMMM YYYY');
        rows.push(<div key={`header-${month}`}>{headerText}</div>);
        lastMonth = month;
      }
      rows.push(<Transaction transaction={t} key={t.id}/>);
    }
    lastMonthTransactions = monthMap.get(lastMonth);
    if (lastMonthTransactions) {
      rows.push(<TransactionsTableSumRow transactions={lastMonthTransactions} />);
    }

    return rows;
  }
});

const mapStateToProps = (state: IAppState): IMonthlyAppStateProps => ({
  transactions: state.transactions.transactions,
  spendTargets: state.settings.settings.spendTargets,
});
const mapDispatchToProps = (dispatch: ThunkDispatch<IAppState, null, any>): IMonthlyDispatchProps => ({
  fetchTransactions: () => {
    dispatch(TransactionsActions.fetchTransactionsFromDropboxIfNeeded());
  },
  fetchSettings: () => {
    dispatch(fetchSettingsFromDropboxIfNeeded());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Monthly);
