import { createStyles, TextField, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import { InlineDatePicker } from 'material-ui-pickers';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
// tslint:disable-next-line:max-line-length
import { DAILY_EXCLUDE_TAGS, fetchTransactionsFromDropboxIfNeeded, ITransaction, Transaction, TransactionsTable, TransactionUtils } from '../../transactions';
import { IAppState } from '../Model';
import DailyGraph from './DailyGraph';
import MenuBar from './MenuBar';

const styles = (theme: Theme) => createStyles({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  controls: {
    flex: 'none',
    display: 'flex',
    padding: '0 16px 16px',
    '& > :nth-child(2)': {
      margin: '0 24px',
      '@media (max-width: 420px)': {
        margin: '0 8px',
      },
    },
    '& > :nth-child(3)': {
      flexShrink: 1.5,
    },
    '@media (max-width: 420px)': {
      '& button': {
        padding: 0,
      },
    },
  },
  transactionsTable: {
    flex: 1,
    overflow: 'auto',
    borderTop: '1px solid lightgrey',
  },
});
interface IDailyOwnProps extends WithStyles<typeof styles> {
}
interface IDailyAppStateProps {
  transactions: ITransaction[];
}
interface IDailyDispatchProps {
  fetchTransactions: () => void;
}
type IDailyProps = IDailyOwnProps & IDailyAppStateProps & IDailyDispatchProps;
interface IDailyState {
  startDate: Date;
  endDate: Date;
  dailyBudgetCents: number;
}

const Daily = withStyles(styles)(
class extends React.Component<IDailyProps, IDailyState> {
  constructor(props: IDailyProps, context?: any) {
    super(props, context);
    this.state = {
      // March 3, 2018 (months are 0 indexed).
      startDate: new Date(2018, 2, 3),
      endDate: this.props.transactions.length
          ? moment(this.props.transactions[0].date).toDate()
          : moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate(),
      dailyBudgetCents: 10402,
    };
    this.props.fetchTransactions();
  }

  public componentDidUpdate(prevProps: IDailyProps): void {
    if (this.props.transactions !== prevProps.transactions && this.props.transactions.length) {
      this.setState({
        endDate: moment(this.props.transactions[0].date).toDate(),
      });
    }
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let filteredTransactions = this.props.transactions.filter(t => {
      // TODO: Would it be faster to use moment(t.date).toDate()?
      let [fullYear, month, day] = t.date.split('-');
      let transactionDate = new Date(parseInt(fullYear, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return this.state.startDate <= transactionDate
          && transactionDate <= this.state.endDate
          && !TransactionUtils.shouldExclude(t, DAILY_EXCLUDE_TAGS);
    });
    let rows = filteredTransactions.map(t => {
        return (
          <Transaction transaction={t} key={t.id}/>
        );
      });

    let minDate = moment(this.state.startDate).toDate();
    let maxDate = moment(this.state.endDate).toDate();
    if (this.props.transactions.length > 0) {
      minDate = moment(this.props.transactions.slice(-1)[0].date).toDate();
      maxDate = moment(this.props.transactions[0].date).toDate();
    }

    return (
      <div className={classes.root}>
        <MenuBar title='Daily'/>

        <DailyGraph
          graph_id='daily-spend-chart'
          transactions={filteredTransactions}
          startDate={this.state.startDate}
          endDate={this.state.endDate}
          dailyBudgetCents={this.state.dailyBudgetCents}
          />

        <div className={classes.controls}>
          <InlineDatePicker
            keyboard
            label='Start date'
            minDate={minDate}
            maxDate={maxDate}
            value={this.state.startDate}
            onChange={this.handleChangeStartDate}
            format='YYYY-MM-DD'
            mask={[/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
          />
          <InlineDatePicker
            keyboard
            label='End date'
            minDate={minDate}
            maxDate={maxDate}
            value={this.state.endDate}
            onChange={this.handleChangeEndDate}
            format='YYYY-MM-DD'
            mask={[/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
          />
          <div style={{whiteSpace: 'nowrap'}}>
            $<TextField
              placeholder='Default: 104.02'
              label='Daily Budget'
              style={{verticalAlign: 'baseline'}}
              defaultValue={this.state.dailyBudgetCents / 100.0}
              onChange={this.handleChangeDailyBudget}
            />
          </div>
        </div>
        <TransactionsTable
            classes={{root: classes.transactionsTable}}
            lazyRender>
          {rows}
        </TransactionsTable>
      </div>
    );
  }

  public handleChangeStartDate = (m: moment.Moment): void => {
    this.setState({
      startDate: m.toDate(),
    });
  }

  public handleChangeEndDate = (m: moment.Moment): void => {
    this.setState({
      endDate: m.toDate(),
    });
  }

  public handleChangeDailyBudget = (event: React.ChangeEvent<{}>): void => {
    this.setState({
      dailyBudgetCents: parseInt('' + parseFloat((event.target as HTMLInputElement).value) * 100, 10),
    });
  }
});

const mapStateToProps = (state: IAppState): IDailyAppStateProps => ({
  transactions: state.transactions.transactions,
});
const mapDispatchToProps = (dispatch: ThunkDispatch<IAppState, null, any>): IDailyDispatchProps => ({
  fetchTransactions: () => {
    dispatch(fetchTransactionsFromDropboxIfNeeded());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Daily);
