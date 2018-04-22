import * as React from 'react';
import * as moment from 'moment';
import {RouteComponentProps} from 'react-router';
import DatePicker from 'material-ui/DatePicker';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';

import {Chart} from 'react-google-charts';

import {Dropbox} from 'dropbox';
import {ACCESS_TOKEN} from '../../config';

interface ITransaction {
  id: string;
  description: string;
  original_line: string;
  date: string;
  tags: Array<string>;
  amount_cents: number;
  transactions: Array<ITransaction>;
  source?: string;
}

const EXCLUDE_TAGS = [
  'bank transfer',
  'credit card',
  'exclude',
  'hoa',
  'home sale',
  'insurance',
  'investment',
  'medical',
  'mortgage',
  'new house',
  'paycheck',
  'rent',
  'settlement',
  'stock',
  'taxes',
];

function shouldExclude(transaction: ITransaction): boolean {
  for (let tag of transaction.tags) {
    if (EXCLUDE_TAGS.indexOf(tag) !== -1) {
      return true;
    }
  }
  return false;
}

type ITransactionProps = {
  transaction: ITransaction,
};
class Transaction extends React.Component<ITransactionProps, object> {
  public render(): React.ReactElement<object> {
    return (
      <div>{this.props.transaction.date} {this.props.transaction.amount_cents / 100.0} {this.props.transaction.description}</div>
    );
  }
}

type IDailyGraphProps = {
  transactions: ITransaction[],
  startDate: Date,
  endDate: Date,
  dailyBudgetCents: number,
};
class DailyGraph extends React.Component<IDailyGraphProps, object> {
  public render(): React.ReactElement<object> {
    let data: [string, number][] = [];

    if (this.props.transactions.length) {
      let dailyTotals: { [s: string]: number; } = {};
      for (let m = moment(this.props.startDate); m.isSameOrBefore(moment(this.props.endDate)); m = m.add(1, 'days')) {
        dailyTotals[m.format('YYYY-MM-DD')] = 0;
      }

      for (let transaction of this.props.transactions) {
        if (shouldExclude(transaction)) {
          continue;
        }

        dailyTotals[transaction.date] += transaction.amount_cents;
      }

      let currentTotal = 0;
      for (let m = moment(this.props.startDate); m.isSameOrBefore(moment(this.props.endDate)); m = m.add(1, 'days')) {
        let currentDate = m.format('YYYY-MM-DD');
        currentTotal += dailyTotals[currentDate] - this.props.dailyBudgetCents;
        data.push([currentDate, currentTotal / 100.0]);
      }
    } else {
      data.push([moment().format('YYYY-MM-DD'), 0]);
    }

    return (
      <Chart
          chartType='LineChart'
          columns={[{'label': 'Date', 'type': 'string'}, {'label':'Dollars', 'type':'number'}]}
          rows={data}
          options={{'hAxis': {'title': 'Date'}, 'vAxis': {'title': 'Dollars'}}}
          graph_id='daily-spend-chart'
          width='100%'
          height='400px'
        />
    );
  }
}

type IDailyState = {
  transactions: ITransaction[],
  startDate: Date,
  endDate: Date,
  dailyBudgetCents: number,
};
class Daily extends React.Component<RouteComponentProps<object>, IDailyState> {

  constructor(props:any, context:any) {
    super(props, context);
    this.state = {
      transactions: [],
      // March 3, 2018 (months are 0 indexed).
      startDate: new Date(2018, 2, 3),
      endDate: moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate(),
      dailyBudgetCents: 10402,
    };
  }

  public render(): React.ReactElement<object> {
    let filteredTransactions = this.state.transactions.filter(t => {
      let [fullYear, month, day] = t.date.split('-');
      let transactionDate = new Date(parseInt(fullYear, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return this.state.startDate <= transactionDate && transactionDate <= this.state.endDate && !shouldExclude(t);
    });
    let rows = filteredTransactions.map(t => {
        return (
          <Transaction transaction={t} key={t.id}/>
        );
      });

    return (
      <div>
        <h1>Daily</h1>
        <RaisedButton
          primary={true}
          style={{minWidth: '200px'}}
          onClick={this.handleClickImport}>Import from Dropbox</RaisedButton>

        <DailyGraph
          transactions={filteredTransactions}
          startDate={this.state.startDate}
          endDate={this.state.endDate}
          dailyBudgetCents={this.state.dailyBudgetCents}
          />

        <div id='controls'>
          <DatePicker
            style={{display: 'inline-block'}}
            autoOk={true}
            floatingLabelText='Start date'
            defaultDate={this.state.startDate}
            onChange={this.handleChangeStartDate}
          />
          <DatePicker
            style={{display: 'inline-block', marginLeft: '24px', marginRight: '24px'}}
            autoOk={true}
            floatingLabelText='End date'
            defaultDate={this.state.endDate}
            onChange={this.handleChangeEndDate}
          />
          $<TextField
            hintText='Default: 104.02'
            floatingLabelText='Daily Budget'
            defaultValue={this.state.dailyBudgetCents / 100.0}
            onChange={this.handleChangeDailyBudget}
          />
        </div>
        {rows}
      </div>
    );
  }

  public handleChangeStartDate = (event: Event, date: Date): void => {
    this.setState({
      startDate: date,
    });
  }

  public handleChangeEndDate = (event: Event, date: Date): void => {
    this.setState({
      endDate: date,
    });
  }

  public handleChangeDailyBudget = (event: any, budget: string): void => {
    this.setState({
      dailyBudgetCents: parseInt('' + parseFloat(budget) * 100, 10),
    });
  }

  public handleClickImport = (): void => {
    let filesDownloadArg = {
      path: '/transactions.json',
    };
    let dbx = new Dropbox({ accessToken: ACCESS_TOKEN });
    let daily = this;
    dbx.filesDownload(filesDownloadArg)
        .then(file => {
            let fr = new FileReader();
            fr.addEventListener('load', ev => {
                daily.setState({
                  transactions: JSON.parse(fr.result),
                });
                // onSuccess(this);
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
}

export default Daily;
