import TextField from '@material-ui/core/TextField';
import { Dropbox } from 'dropbox';
import { InlineDatePicker } from 'material-ui-pickers';
import * as moment from 'moment';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import Measure from 'react-measure';
import { RouteComponentProps } from 'react-router';
import { ACCESS_TOKEN } from '../../config';
import { DAILY_EXCLUDE_TAGS, ITransaction, shouldExclude, Transaction } from '../../transactions';
import MenuBar from './MenuBar';

type IDailyGraphProps = {
  transactions: ITransaction[],
  startDate: Date,
  endDate: Date,
  dailyBudgetCents: number,
};
type IDailyGraphState = {
  dimensions: {
    width: number,
    height: number,
  },
};
class DailyGraph extends React.Component<IDailyGraphProps, IDailyGraphState> {

  constructor(props:IDailyGraphProps, context:any) {
    super(props, context);
    this.state = {
      dimensions: {
        width: -1,
        height: -1,
      },
    };
  }

  public render(): React.ReactElement<object> {
    let data: [string, number][] = [];

    if (this.props.transactions.length) {
      let dailyTotals: { [s: string]: number; } = {};
      for (let m = moment(this.props.startDate); m.isSameOrBefore(moment(this.props.endDate)); m = m.add(1, 'days')) {
        dailyTotals[m.format('YYYY-MM-DD')] = 0;
      }

      for (let transaction of this.props.transactions) {
        if (shouldExclude(transaction, DAILY_EXCLUDE_TAGS)) {
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
    if (this.state.dimensions.width != -1) {
      // Limit the number of graph points based on how much space we have.
      let maxToShow = Math.max(Math.round(this.state.dimensions.width / 10), 31);
      if (maxToShow < data.length) {
        data = data.slice(data.length - maxToShow);
      }
    }

    return (
      <Measure
        bounds
        onResize={(contentRect) => {
          this.setState({
            dimensions: {
              width: contentRect!.bounds!.width,
              height: contentRect!.bounds!.height,
            },
          });
        }}
      >
        {({ measureRef }) =>
          <div ref={measureRef} className='chart'>
            <Chart
                chartType='LineChart'
                columns={[{'label': 'Date', 'type': 'string'}, {'label':'Dollars', 'type':'number'}]}
                rows={data}
                options={{'hAxis': {'title': 'Date'}, 'vAxis': {'title': 'Dollars'}, 'legend': 'none'}}
                graph_id='daily-spend-chart'
                width='auto'
                height='100%'
              />
          </div>
        }
      </Measure>
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
    this.loadFromDropbox();
  }

  public render(): React.ReactElement<object> {
    let filteredTransactions = this.state.transactions.filter(t => {
      // TODO: Would it be faster to use moment(t.date).toDate()?
      let [fullYear, month, day] = t.date.split('-');
      let transactionDate = new Date(parseInt(fullYear, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return this.state.startDate <= transactionDate
          && transactionDate <= this.state.endDate
          && !shouldExclude(t, DAILY_EXCLUDE_TAGS);
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
      <div id='page-daily'>
        <MenuBar title='Daily'/>

        <DailyGraph
          transactions={filteredTransactions}
          startDate={this.state.startDate}
          endDate={this.state.endDate}
          dailyBudgetCents={this.state.dailyBudgetCents}
          />

        <div className='controls'>
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
        <div className='transactions'>
          {rows}
        </div>
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
}

export default Daily;
