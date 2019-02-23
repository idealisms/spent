import { createStyles, TextField, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import { Dropbox } from 'dropbox';
import { InlineDatePicker } from 'material-ui-pickers';
import moment from 'moment';
import * as React from 'react';
import { ACCESS_TOKEN } from '../../config';
import { DAILY_EXCLUDE_TAGS, ITransaction, Transaction, TransactionsTable, TransactionUtils } from '../../transactions';
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
interface IDailyProps extends WithStyles<typeof styles> {
}
interface IDailyState {
  transactions: ITransaction[];
  startDate: Date;
  endDate: Date;
  dailyBudgetCents: number;
}

const Daily = withStyles(styles)(
class extends React.Component<IDailyProps, IDailyState> {
  constructor(props: IDailyProps, context?: any) {
    super(props, context);
    this.state = {
      transactions: [],
      // March 3, 2018 (months are 0 indexed).
      startDate: new Date(2018, 2, 3),
      endDate: moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate(),
      dailyBudgetCents: 10402,
    };
    this.loadFromDropbox();
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let filteredTransactions = this.state.transactions.filter(t => {
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
    if (this.state.transactions.length > 0) {
      minDate = moment(this.state.transactions.slice(-1)[0].date).toDate();
      maxDate = moment(this.state.transactions[0].date).toDate();
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

  public loadFromDropbox = (): void => {
    let filesDownloadArg = {
      path: '/transactions.json',
    };
    let dbx = new Dropbox({ accessToken: ACCESS_TOKEN });
    let daily = this;
    dbx.filesDownload(filesDownloadArg)
        .then(file => {
            let fr = new FileReader();
            fr.addEventListener('load', ev => {
                let transactions: ITransaction[] = JSON.parse(fr.result as string);
                let state: any = { transactions: transactions };
                if (transactions[0]) {
                  state.endDate = moment(transactions[0].date).toDate();
                }
                daily.setState(state);
            });
            fr.addEventListener('error', ev => {
                console.log(ev);
            });
            // NOTE: The Dropbox SDK specification does not include a fileBlob
            // field on the FileLinkMetadataReference type, so it is missing from
            // the TypeScript type. This field is injected by the Dropbox SDK.
            fr.readAsText((file as any).fileBlob);
        }).catch(error => {
            console.log(error);
        });

  }
});

export default Daily;
