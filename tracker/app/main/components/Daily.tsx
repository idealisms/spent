import { createStyles, TextField, WithStyles } from '@material-ui/core';
import MenuItem from '@material-ui/core/MenuItem';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import Select from '@material-ui/core/Select';
import { Theme, withStyles } from '@material-ui/core/styles';
import { InlineDatePicker } from 'material-ui-pickers';
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
  controls: {
    flex: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    marginTop: '16px',
    '& .budgetText': {
      whiteSpace: 'nowrap',
      flexShrink: 1.5,
    },
    '& .budgetText > div': {
      width: 'calc(100% - 8px)',
    },
    '& > *': {
      margin: '0 12px 16px',
      '@media (max-width: 420px)': {
        margin: '0 8px 8px',
      },
    },
    '& > :not(:first-child)': {
      flex: '1 1 120px',
    },
    '@media (max-width: 420px)': {
      marginTop: '4px',
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

type filterTransactionsFunction = (
    transactions: ITransaction[],
    startDate: Date,
    endDate: Date,
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
  spendTargetIndex: number;
  startDate: Date;
  endDate: Date;
  dailyBudgetCents: number;
  scrollToRow?: number;
}

const Daily = withStyles(styles)(
class extends React.Component<IDailyProps, IDailyState> {
  constructor(props: IDailyProps, context?: any) {
    super(props, context);
    let spendTargetIndex = 0;
    let [startDate, endDate] = this.startEndDatesFromProps(spendTargetIndex);

    this.state = {
      spendTargetIndex,
      startDate,
      endDate,
      dailyBudgetCents: this.props.spendTargets.length > 0
          ? this.props.spendTargets[spendTargetIndex].targetAnnualCents / 365
          : 0,
    };
    this.props.fetchTransactions();
    this.props.fetchSettings();
  }

  public componentDidUpdate(prevProps: IDailyProps): void {
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
    let filteredTransactions = this.filterTransactions(
        this.props.transactions, this.state.startDate, this.state.endDate, spendTarget);
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
          onClickDate={this.scrollDateIntoView}
          spendTarget={spendTarget}
          />

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

          <div className='budgetText'>
            $<TextField
              placeholder='Default: 104.02'
              label='Daily Budget'
              style={{verticalAlign: 'baseline'}}
              value={this.state.dailyBudgetCents / 100.0}
              InputProps={{readOnly: true}}
              onChange={this.handleChangeDailyBudget}
            />
          </div>

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
        </div>
        <TransactionsTable
            classes={{root: classes.transactionsTable}}
            lazyRender
            scrollToRow={this.state.scrollToRow}>
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

  public scrollDateIntoView = (date: Date): void => {
    let spendTarget = this.props.spendTargets.length > 0
        ? this.props.spendTargets[this.state.spendTargetIndex]
        : undefined;
    let filteredTransactions = this.filterTransactions(
        this.props.transactions, this.state.startDate, this.state.endDate, spendTarget);

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

  private updateSpendTarget = (spendTargetIndex: number): void => {
    if (this.props.spendTargets.length == 0) {
      return;
    }
    let spendTarget = this.props.spendTargets[spendTargetIndex];
    let [startDate, endDate] = this.startEndDatesFromProps(spendTargetIndex);
    this.setState({
      spendTargetIndex,
      startDate,
      endDate,
      dailyBudgetCents: spendTarget.targetAnnualCents / 365,
    });
  }

  private startEndDatesFromProps = (spendTargetIndex?: number): [Date, Date] => {
    let endDate = this.props.transactions.length
        ? moment(this.props.transactions[0].date).toDate()
        : moment().startOf('day').toDate();
    if (this.props.spendTargets.length > 0) {
      spendTargetIndex = (spendTargetIndex === undefined) ? this.state.spendTargetIndex : spendTargetIndex;
      let spendTarget = this.props.spendTargets[spendTargetIndex];
      return [
          moment(spendTarget.startDate).toDate(),
          spendTarget.endDate ? moment(spendTarget.endDate).toDate() : endDate,
        ];
    }
    return [
      moment().startOf('day').toDate(),
      endDate,
    ];
  }

  // tslint:disable-next-line:member-ordering (this is a function, not a field)
  private filterTransactions: filterTransactionsFunction = memoize<filterTransactionsFunction>(
      (transactions, startDate, endDate, spendTarget?) => {
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
