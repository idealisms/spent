import { Dropbox } from 'dropbox';
import DatePicker from 'material-ui/DatePicker';
import * as moment from 'moment';
import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { ACCESS_TOKEN } from '../../config';
import { ITransaction, Transaction } from '../../transactions';
import MenuBar from './MenuBar';

type ICategoriesState = {
  transactions: ITransaction[],
  startDate: Date,
  endDate: Date,
  selectedTransactions: Set<string>,
};
class Categories extends React.Component<RouteComponentProps<object>, ICategoriesState> {

  constructor(props:any, context:any) {
    super(props, context);
    this.state = {
      transactions: [],
      // Months are 0 indexed.
      // startDate: new Date(2012, 0, 1),
      startDate: new Date(2018, 0, 1),
      endDate: moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate(),
      selectedTransactions: new Set(),
    };
    this.loadFromDropbox();
  }

  public render(): React.ReactElement<object> {
    let filteredTransactions = this.state.transactions.filter(t => {
      let [fullYear, month, day] = t.date.split('-');
      let transactionDate = new Date(parseInt(fullYear, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return this.state.startDate <= transactionDate && transactionDate <= this.state.endDate;
    });
    let rows = filteredTransactions.map(t => {
        return (
          <Transaction
              key={t.id}
              transaction={t}
              isSelected={this.state.selectedTransactions.has(t.id)}
              onCategoryClick={(clicked: ITransaction) => this.handleTransactionClick(clicked)}/>
        );
      });

    return (
      <div id='page-categories'>
        <MenuBar
            title='Categories'
            selectedTransactions={this.state.selectedTransactions}
            onSelectedBackClick={() => this.handleClearSelections()}
             />

        {/* <DailyGraph
          transactions={filteredTransactions}
          startDate={this.state.startDate}
          endDate={this.state.endDate}
          dailyBudgetCents={this.state.dailyBudgetCents}
          /> */}

        <div className='controls'>
          <DatePicker
            className='start-date'
            ref='start-date'
            autoOk={true}
            floatingLabelText='Start date'
            defaultDate={this.state.startDate}
            onChange={this.handleChangeStartDate}
          />
          <DatePicker
            className='end-date'
            ref='end-date'
            style={{marginLeft: '24px', marginRight: '24px'}}
            autoOk={true}
            floatingLabelText='End date'
            defaultDate={this.state.endDate}
            onChange={this.handleChangeEndDate}
          />
        </div>
        <div className='transactions'>
          {rows}
        </div>
      </div>
    );
  }

  public handleChangeStartDate(event: Event, date: Date): void {
    this.setState({
      startDate: date,
    });
  }

  public handleChangeEndDate(event: Event, date: Date): void {
    this.setState({
      endDate: date,
    });
  }

  public handleTransactionClick(t: ITransaction): void {
    let selectedTransactions = new Set(this.state.selectedTransactions.values());
    if (selectedTransactions.has(t.id)) {
      selectedTransactions.delete(t.id);
    } else {
      selectedTransactions.add(t.id);
    }
    this.setState({
      selectedTransactions: selectedTransactions,
    });
  }

  public handleClearSelections(): void {
    this.setState({
      selectedTransactions: new Set(),
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
                let transactions: ITransaction[] = JSON.parse(fr.result);
                let state: any = { transactions: transactions };
                if (transactions[0]) {
                  state.endDate = moment(transactions[0].date).toDate();
                }
                let endDate = daily.refs['end-date'] as DatePicker;
                endDate.setState({
                  date: moment(transactions[0].date).toDate(),
                });
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

export default Categories;
