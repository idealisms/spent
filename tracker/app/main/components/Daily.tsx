import * as React from 'react';
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

type ITransactionProps = {
  transaction: ITransaction,
};
class Transaction extends React.Component<ITransactionProps, object> {
  public render(): React.ReactElement<object> {
    return (
      <div>{this.props.transaction.date} {this.props.transaction.amount_cents} {this.props.transaction.description}</div>
    );
  }
}

type IDailyGraphProps = {
  transactions: ITransaction[],
};
class DailyGraph extends React.Component<IDailyGraphProps, object> {
  public render(): React.ReactElement<object> {
    return (
      <Chart
          chartType='ScatterChart'
          data={[['Age', 'Weight'], [8, 12], [4, 5.55], [10, 14]]}
          options={{}}
          graph_id='ScatterChart'
          width='100%'
          height='400px'
          legend_toggle
        />
    );
  }
}

type IDailyState = {
  transactions: ITransaction[],
  startDate: Date,
  endDate: Date,
};
class Daily extends React.Component<RouteComponentProps<object>, IDailyState> {

  constructor(props:any, context:any) {
    super(props, context);
    this.state = {
      transactions: [],
      startDate: new Date(2018, 2, 3),
      endDate: new Date(),
    };
  }

  public render(): React.ReactElement<object> {
    let filteredTransactions = this.state.transactions.filter(t => {
      let [fullYear, month, day] = t.date.split('-');
      let transactionDate = new Date(parseInt(fullYear, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return this.state.startDate <= transactionDate && transactionDate <= this.state.endDate;
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

        <DailyGraph transactions={filteredTransactions} />

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
            defaultValue='104.02'
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
