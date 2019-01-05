import TextField from '@material-ui/core/TextField';
import * as Dropbox from 'dropbox';
import { CircularProgress } from 'material-ui';
import * as moment from 'moment';
import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { ACCESS_TOKEN } from '../../config';
import { compareTransactions, filterTransactionsByDate, generateUUID, ITransaction, Transaction } from '../../transactions';
import MenuBar, { CloudState } from './MenuBar';

type IEditorState = {
  transactions: ITransaction[],
  visibleTransactions: ITransaction[],
  startDate: Date,
  endDate: Date,
  selectedTransactions: Map<string, ITransaction>,
  cloudState: CloudState,
};
class Editor extends React.Component<RouteComponentProps<object>, IEditorState> {

  constructor(props:any, context:any) {
    super(props, context);
    this.state = {
      transactions: [],
      visibleTransactions: [],
      startDate: moment().subtract(3, 'months').toDate(),
      endDate: moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate(),
      selectedTransactions: new Map(),
      cloudState: CloudState.Done,
    };
    this.loadFromDropbox();
  }

  public render(): React.ReactElement<object> {
    let rows = this.state.visibleTransactions.map(t => {
        return (
          <Transaction
              key={t.id}
              transaction={t}
              isSelected={this.state.selectedTransactions.has(t.id)}
              onCategoryClick={(clicked: ITransaction) => this.handleTransactionClick(clicked)}
              />
        );
      });

    return (
      <div id='page-editor'>
        <MenuBar
            title='Editor'
            selectedTransactions={this.state.selectedTransactions}
            cloudState={this.state.cloudState}
            onSaveClick={this.handleSaveTransactions}
            onSelectedBackClick={() => this.handleClearSelections()}
            onSelectedEditSaveClick={(transaction: ITransaction) => this.handleUpdateTransaction(transaction)}
            onSelectedMergeSaveClick={(transaction: ITransaction) => this.handleMergeSelectedTransactions(transaction)}
            onSelectedDeleteClick={(transactions: Map<string, ITransaction>) => this.handleDeleteTransactions(transactions)}
            onSelectedSplitSaveClick={(transactions: Map<string, ITransaction>) => this.handleSplitTransaction(transactions)}
        />

        <div className='controls'>
          <TextField
            className='start-date'
            type='date'
            label='Start date'
            value={moment(this.state.startDate).format('YYYY-MM-DD')}
            onChange={this.handleChangeStartDate}
          />
          <TextField
            className='end-date'
            type='date'
            style={{marginLeft: '24px', marginRight: '24px'}}
            label='End date'
            value={moment(this.state.endDate).format('YYYY-MM-DD')}
            onChange={this.handleChangeEndDate}
          />
        </div>
        {this.state.transactions.length
            ? <div className='transactions'>{rows}</div>
            : <div className='loading-container'><CircularProgress size={40} /></div>}
      </div>
    );
  }

  public handleChangeStartDate = (event: React.ChangeEvent<{}>): void => {
    let dateStr = (event.target as HTMLInputElement).value;
    let startDate = moment(dateStr).toDate();
    this.setState({
      startDate: startDate,
      visibleTransactions: this.filterTransactions(this.state.transactions, startDate),
    });
  }

  public handleChangeEndDate = (event: React.ChangeEvent<{}>): void => {
    let dateStr = (event.target as HTMLInputElement).value;
    let endDate = moment(dateStr).toDate();
    this.setState({
      endDate: endDate,
      visibleTransactions: this.filterTransactions(this.state.transactions, undefined, endDate),
    });
  }

  private handleTransactionClick(t: ITransaction): void {
    let selectedTransactions = new Map(this.state.selectedTransactions.entries());
    if (selectedTransactions.has(t.id)) {
      selectedTransactions.delete(t.id);
    } else {
      selectedTransactions.set(t.id, t);
    }
    this.setState({
      selectedTransactions: selectedTransactions,
    });
  }

  private handleUpdateTransaction(transaction: ITransaction): void {
    for (let t of this.state.transactions) {
      if (t.id == transaction.id) {
        t.notes = transaction.notes;
        t.tags = transaction.tags;
        break;
      }
    }
    // Shouldn't need to update visible transactions since edits don't
    // create or remove transactions.
    this.setState({
      transactions: this.state.transactions,
      selectedTransactions: new Map(),
      cloudState: CloudState.Modified,
    });
  }

  private handleMergeSelectedTransactions(transaction: ITransaction): void {
    let fromTransactions = this.state.selectedTransactions;
    fromTransactions.delete(transaction.id);
    let selectedTransactions = new Map();
    let transactionsToKeep: ITransaction[] = [];
    for (let t of this.state.transactions) {
      if (fromTransactions.has(t.id)) {
        continue;
      } else if (t.id == transaction.id) {
        t = Object.assign({}, transaction);
        t.id = generateUUID();
        t.transactions = [...transaction.transactions];
        if (transaction.transactions && transaction.transactions.length == 0) {
          t.transactions.push(transaction);
        }

        for (let fromTransaction of fromTransactions.values()) {
          t.amount_cents += fromTransaction.amount_cents;
          if (fromTransaction.transactions && fromTransaction.transactions.length > 0) {
            t.transactions.push(...fromTransaction.transactions);
          } else {
            t.transactions.push(fromTransaction);
          }
        }
        selectedTransactions.set(t.id, t);
        console.log(t);
      }
      transactionsToKeep.push(t);
    }
    this.setState({
      transactions: transactionsToKeep,
      visibleTransactions: this.filterTransactions(transactionsToKeep),
      selectedTransactions,
      cloudState: CloudState.Modified,
    });
  }

  private handleDeleteTransactions(transactionsToDelete: Map<string, ITransaction>): void {
    let transactionsToKeep = this.state.transactions.filter((t: ITransaction) => {
      return !transactionsToDelete.has(t.id);
    });
    this.setState({
      transactions: transactionsToKeep,
      visibleTransactions: this.filterTransactions(transactionsToKeep),
      selectedTransactions: new Map(),
      cloudState: CloudState.Modified,
    });
  }

  private handleSplitTransaction(newTransactions: Map<string, ITransaction>): void {
    let transactionsToKeep = this.state.transactions.filter((t: ITransaction) => {
      return !this.state.selectedTransactions.has(t.id);
    });
    let selectedTransactions = new Map();
    for (let transaction of newTransactions.values()) {
      transactionsToKeep.push(transaction);
      selectedTransactions.set(transaction.id, transaction);
    }
    transactionsToKeep.sort(compareTransactions);
    this.setState({
      transactions: transactionsToKeep,
      visibleTransactions: this.filterTransactions(transactionsToKeep),
      selectedTransactions,
      cloudState: CloudState.Modified,
    });
  }

  private handleSaveTransactions = (): void => {
    this.setState({cloudState: CloudState.Uploading});
    let filesCommitInfo = {
        contents: JSON.stringify(this.state.transactions),
        path: '/transactions.json',
        mode: {'.tag': 'overwrite'} as DropboxTypes.files.WriteModeOverwrite,
        autorename: false,
        mute: false,
    };
    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN });
    dbx.filesUpload(filesCommitInfo)
        .then(metadata => {
            console.log('wrote to dropbox');
            console.log(metadata);
            this.setState({cloudState: CloudState.Done});
        }).catch(error => {
            console.log('error');
            console.log(error);
            this.setState({cloudState: CloudState.Modified});
        });
  }

  private handleClearSelections(): void {
    this.setState({
      selectedTransactions: new Map(),
    });
  }

  private loadFromDropbox = (): void => {
    let filesDownloadArg = {
      path: '/transactions.json',
    };
    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN });
    let daily = this;
    dbx.filesDownload(filesDownloadArg)
        .then(file => {
            let fr = new FileReader();
            fr.addEventListener('load', ev => {
                let transactions: ITransaction[] = JSON.parse(fr.result as string);
                // let endDate = daily.refs['end-date'] as DatePicker;
                // endDate.setState({
                //   date: moment(transactions[0].date).toDate(),
                // });

                let state: any = {
                  transactions: transactions,
                  visibleTransactions: this.filterTransactions(transactions),
                };
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

  private filterTransactions(transactions: ITransaction[], startDate?: Date, endDate?: Date): ITransaction[] {
    return filterTransactionsByDate(transactions, startDate || this.state.startDate, endDate || this.state.endDate);
  }
}

export default Editor;
