import { createStyles, TextField, WithStyles } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as Dropbox from 'dropbox';
import { InlineDatePicker } from 'material-ui-pickers';
import * as moment from 'moment';
import * as React from 'react';
import Select from 'react-select';
import { ValueType } from 'react-select/lib/types';
import { isUndefined } from 'util';
import { ACCESS_TOKEN } from '../../config';
import * as Transactions from '../../transactions';
import MenuBar, { CloudState } from './MenuBar';

const styles = (theme: Theme) => createStyles({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    borderTop: '1px solid lightgrey',
    textAlign: 'center',
    paddingTop: '24px',
  },
  controls: {
    display: 'flex',
    flex: 'none',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    padding: '8px 4px',
    justifyContent: 'space-between',

    '& > *': {
      margin: '8px 12px',
      '@media (max-width: 420px)': {
        marginTop: '4px',
        marginBottom: '4px',
      },
    },
    '& .datepicker': {
      flex: '1 0 140px',
      maxWidth: '160px',
    },
    '& .tagselect': {
      flex: '10 1 140px',
    },
    '& .search': {
      flex: '10 1 140px',
      '@media (max-width: 420px)': {
        marginTop: '0 !important',
        marginBottom: '4px !important',
      },
    },
  },
  transactionsTable: {
    flex: 1,
    overflow: 'auto',
  },
});

interface IEditorProps extends WithStyles<typeof styles> {
}
interface IEditorState {
  transactions: Transactions.ITransaction[];
  visibleTransactions: Transactions.ITransaction[];
  startDate: Date;
  endDate: Date;
  selectedTransactions: Map<string, Transactions.ITransaction>;
  cloudState: CloudState;
  tagFilters: ValueType<{label: string, value: string}>;
  searchQuery: string;
}

const Editor = withStyles(styles)(
class extends React.Component<IEditorProps, IEditorState> {
  constructor(props: IEditorProps, context?: any) {
    super(props, context);
    this.state = {
      transactions: [],
      visibleTransactions: [],
      startDate: moment().subtract(3, 'months').toDate(),
      endDate: moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate(),
      selectedTransactions: new Map(),
      cloudState: CloudState.Done,
      tagFilters: null,
      searchQuery: '',
    };
    this.loadFromDropbox();
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let rows = this.state.visibleTransactions.map(t => {
        return (
          <Transactions.Transaction
              key={t.id}
              transaction={t}
              isSelected={this.state.selectedTransactions.has(t.id)}
              onCategoryClick={this.handleTransactionClick}
              />
        );
      });

    let minDate = moment(this.state.startDate).toDate();
    let maxDate = moment(this.state.endDate).toDate();
    if (this.state.transactions.length > 0) {
      minDate = moment(this.state.transactions.slice(-1)[0].date).toDate();
      maxDate = moment(this.state.transactions[0].date).toDate();
    }

    let tags = Transactions.TransactionUtils.getTags(this.state.visibleTransactions);
    let tagSuggestions = new Array(...tags).sort().map(
        (t) => ({label: t, value: t}),
        tags);
    return (
      <div className={classes.root}>
        <MenuBar
            title='Editor'
            selectedTransactions={this.state.selectedTransactions}
            cloudState={this.state.cloudState}
            onSaveClick={this.handleSaveTransactions}
            onSelectedBackClick={this.handleClearSelections}
            onSelectedEditSaveClick={this.handleEditTransaction}
            onSelectedBatchEditTagsSaveClick={this.handleBatchEditTags}
            onSelectedMergeSaveClick={this.handleMergeSelectedTransactions}
            onSelectedDeleteClick={this.handleDeleteTransactions}
            onSelectedSplitSaveClick={this.handleSplitTransaction}
        />

        <div className={classes.controls}>
          <InlineDatePicker
            className='datepicker'
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
            className='datepicker'
            keyboard
            label='End date'
            minDate={minDate}
            maxDate={maxDate}
            value={this.state.endDate}
            onChange={this.handleChangeEndDate}
            format='YYYY-MM-DD'
            mask={[/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
          />

          <Select
            className='tagselect'
            value={this.state.tagFilters}
            onChange={this.handleChangeTagFilter}
            options={tagSuggestions}
            placeholder='Select tags'
            isMulti />

          <TextField
            className='search'
            label='Search'
            type='search'
            margin='dense'
            onChange={this.handleChangeSearch}
            value={this.state.searchQuery}
          />
        </div>
        {this.state.transactions.length
            ? <Transactions.TransactionsTable classes={{root: classes.transactionsTable}}>
                <Transactions.TransactionsTableHeader
                    transactions={this.state.visibleTransactions}
                    selectAllChecked={this.state.visibleTransactions.length == this.state.selectedTransactions.size}
                    onSelectAllClick={this.handleSelectAllClick}
                    />
                {rows}
              </Transactions.TransactionsTable>
            : <div className={classes.loadingContainer}><CircularProgress /></div>}
    </div>);
  }

  public handleChangeStartDate = (m: moment.Moment): void => {
    let startDate = m.toDate();
    this.setState({
      startDate,
      visibleTransactions: this.filterTransactions(this.state.transactions, startDate),
      selectedTransactions: new Map(),
    });
  }

  public handleChangeEndDate = (m: moment.Moment): void => {
    let endDate = m.toDate();
    this.setState({
      endDate,
      visibleTransactions: this.filterTransactions(this.state.transactions, undefined, endDate),
      selectedTransactions: new Map(),
    });
  }

  public handleChangeTagFilter = (tagFilters: ValueType<{label: string, value: string}>, action: any): void => {
    this.setState({
      tagFilters: tagFilters,
      visibleTransactions: this.filterTransactions(
          this.state.transactions, undefined, undefined, tagFilters),
      selectedTransactions: new Map(),
    });
  }

  public handleChangeSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    let searchQuery = event.target.value;
    this.setState({
      searchQuery,
      visibleTransactions: this.filterTransactions(
          this.state.transactions, undefined, undefined, undefined, searchQuery),
      selectedTransactions: new Map(),
    });
  }

  public handleSelectAllClick = (selectAll: boolean): void => {
    if (selectAll) {
      let selectedTransactions = new Map();
      this.state.visibleTransactions.forEach((t) => {
        selectedTransactions.set(t.id, t);
      });
      this.setState({
        selectedTransactions,
      });
    } else {
      this.setState({
        selectedTransactions: new Map(),
      });
    }
  }

  private handleTransactionClick = (t: Transactions.ITransaction): void => {
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

  private handleEditTransaction = (): void => {
    // We re-filter the transactions since edits can change search string or
    // tag matches.
    this.setState({
      transactions: this.state.transactions,
      selectedTransactions: new Map(),
      visibleTransactions: this.filterTransactions(this.state.transactions),
      cloudState: CloudState.Modified,
    });
  }

  private handleBatchEditTags = () => {
    // Since clearning/removing tags can change the tagFilter results,
    // reset it.
    this.setState({
      transactions: this.state.transactions,
      tagFilters: null,
      visibleTransactions: this.filterTransactions(
          this.state.transactions, undefined, undefined, null),
      cloudState: CloudState.Modified,
    });
  }

  private handleMergeSelectedTransactions = (transaction: Transactions.ITransaction): void => {
    let fromTransactions = this.state.selectedTransactions;
    fromTransactions.delete(transaction.id);
    let selectedTransactions = new Map();
    let transactionsToKeep: Transactions.ITransaction[] = [];
    for (let t of this.state.transactions) {
      if (fromTransactions.has(t.id)) {
        continue;
      } else if (t.id == transaction.id) {
        t = Object.assign({}, transaction);
        t.id = Transactions.TransactionUtils.generateUUID();
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

  private handleDeleteTransactions = (transactionsToDelete: Map<string, Transactions.ITransaction>): void => {
    let transactionsToKeep = this.state.transactions.filter((t: Transactions.ITransaction) => {
      return !transactionsToDelete.has(t.id);
    });
    this.setState({
      transactions: transactionsToKeep,
      visibleTransactions: this.filterTransactions(transactionsToKeep),
      selectedTransactions: new Map(),
      cloudState: CloudState.Modified,
    });
  }

  private handleSplitTransaction = (newTransactions: Map<string, Transactions.ITransaction>): void => {
    let transactionsToKeep = this.state.transactions.filter((t: Transactions.ITransaction) => {
      return !this.state.selectedTransactions.has(t.id);
    });
    let selectedTransactions = new Map();
    for (let transaction of newTransactions.values()) {
      transactionsToKeep.push(transaction);
      selectedTransactions.set(transaction.id, transaction);
    }
    transactionsToKeep.sort(Transactions.TransactionUtils.compareTransactions);
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
    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN, fetch: fetch });
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

  private handleClearSelections = (): void => {
    this.setState({
      selectedTransactions: new Map(),
    });
  }

  private loadFromDropbox = (): void => {
    let filesDownloadArg = {
      path: '/transactions.json',
    };
    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN, fetch: fetch });
    let daily = this;
    dbx.filesDownload(filesDownloadArg)
        .then(file => {
            let fr = new FileReader();
            fr.addEventListener('load', ev => {
                let transactions: Transactions.ITransaction[] = JSON.parse(fr.result as string);

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

  private filterTransactions(
      transactions: Transactions.ITransaction[],
      startDate?: Date,
      endDate?: Date,
      tagFilters?: ValueType<{label: string, value: string}>,
      searchQuery?: string): Transactions.ITransaction[] {

    let filteredTransactions = Transactions.TransactionUtils.filterTransactionsByDate(
        transactions,
        startDate || this.state.startDate,
        endDate || this.state.endDate);

    tagFilters = isUndefined(tagFilters) ? this.state.tagFilters : tagFilters;
    if (Array.isArray(tagFilters) && tagFilters.length > 0) {
      let tagsInclude = new Set(tagFilters.map((t) => (t.value)));

      filteredTransactions = filteredTransactions.filter((transaction) => {
        let intersection = transaction.tags.filter((t) => tagsInclude.has(t));
        return intersection.length == tagsInclude.size;
      });
    }
    searchQuery = isUndefined(searchQuery) ? this.state.searchQuery : searchQuery;
    if (searchQuery) {
      let tokens = searchQuery.toLowerCase().split(/\s+/);
      filteredTransactions = filteredTransactions.filter((transaction) => {
        let descriptionLowerCase = transaction.description.toLowerCase();
        let notesLowerCase = (transaction.notes || '').toLowerCase();
        for (let token of tokens) {
          if (descriptionLowerCase.indexOf(token) == -1 &&
              notesLowerCase.indexOf(token) == -1) {
            return false;
          }
        }
        return true;
      });
    }
    return filteredTransactions;
  }
});

export default Editor;
