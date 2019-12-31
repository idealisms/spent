import { createStyles, TextField, WithStyles } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import Fab from '@material-ui/core/Fab';
import { Theme, withStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import { KeyboardDatePicker } from '@material-ui/pickers';
import { MaterialUiPickersDate } from '@material-ui/pickers/typings/date';
import memoize from 'memoize-one';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import * as Transactions from '../../transactions';
import { CloudState, IAppState } from '../Model';
import EditorMenuBar from './EditorMenuBar';

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
    '& .fab': {
      position: 'absolute',
      right: '16px',
      bottom: '16px',
    },
  },
  transactionsTable: {
    flex: 1,
    overflow: 'auto',
  },
});

type filterTransactionsFunction = (
  transactions: Transactions.ITransaction[],
  startDate: Date,
  endDate: Date,
  tagFilters: string[],
  searchQuery: string) => Transactions.ITransaction[];

interface IEditorOwnProps extends WithStyles<typeof styles> {
}
interface IEditorAppStateProps {
  transactions: Transactions.ITransaction[];
  cloudState: CloudState;
}
interface IEditorDispatchProps {
  fetchTransactions: () => void;
  updateTransactions: (transactions: Transactions.ITransaction[]) => void;
  saveTransactions: () => void;
}
type IEditorProps = IEditorOwnProps & IEditorAppStateProps & IEditorDispatchProps;
interface IEditorState {
  startDate: Date;
  endDate: Date;
  selectedTransactions: Map<string, Transactions.ITransaction>;
  tagFilters: string[];
  searchQuery: string;
  isAddDialogOpen: boolean;
}

const Editor = withStyles(styles)(
class extends React.Component<IEditorProps, IEditorState> {
  constructor(props: IEditorProps, context?: any) {
    super(props, context);

    let transactions = this.props.transactions;
    this.state = {
      startDate: transactions.length
          ? moment(transactions[transactions.length - 1].date).toDate()
          : moment().subtract(3, 'months').toDate(),
      endDate: transactions.length
          ? moment(transactions[0].date).toDate()
          : moment().startOf('day').toDate(),
      selectedTransactions: new Map(),
      tagFilters: [],
      searchQuery: '',
      isAddDialogOpen: false,
    };
    this.props.fetchTransactions();
  }

  public componentDidUpdate(prevProps: IEditorProps): void {
    if (this.props.transactions !== prevProps.transactions) {
      if (prevProps.transactions.length == 0) {
        const transactions = this.props.transactions;
        this.setState({
            startDate: moment(transactions[transactions.length - 1].date).toDate(),
            endDate: moment(transactions[0].date).toDate(),
        });
      }
    }
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let visibleTransactions = this.filterTransactions(
        this.props.transactions, this.state.startDate, this.state.endDate, this.state.tagFilters, this.state.searchQuery);

    let rows = visibleTransactions.map(t => {
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
    if (this.props.transactions.length > 0) {
      minDate = moment(this.props.transactions.slice(-1)[0].date).toDate();
      maxDate = moment(this.props.transactions[0].date).toDate();
    }

    return (
      <div className={classes.root}>
        <EditorMenuBar
            title='Editor'
            selectedTransactions={this.state.selectedTransactions}
            cloudState={this.props.cloudState}
            onSaveClick={this.props.saveTransactions}
            onSelectedBackClick={this.handleClearSelections}
            onSelectedEditSaveClick={this.handleEditTransaction}
            onSelectedBatchEditTagsSaveClick={this.handleBatchEditTags}
            onSelectedMergeSaveClick={this.handleMergeSelectedTransactions}
            onSelectedDeleteClick={this.handleDeleteTransactions}
            onSelectedSplitSaveClick={this.handleSplitTransaction}
        />

        <div className={classes.controls}>
          <KeyboardDatePicker
            className='datepicker'
            label='Start date'
            minDate={minDate}
            maxDate={maxDate}
            value={this.state.startDate}
            onChange={this.handleChangeStartDate}
            format='YYYY-MM-DD'
            // mask={[/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
          />
          <KeyboardDatePicker
            className='datepicker'
            label='End date'
            minDate={minDate}
            maxDate={maxDate}
            value={this.state.endDate}
            onChange={this.handleChangeEndDate}
            format='YYYY-MM-DD'
            // mask={[/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
          />

          <Transactions.TagSelect
              onChange={this.handleChangeTagFilter}
              value={this.state.tagFilters}
              transactions={visibleTransactions}
              className='tagselect'
              placeholder='Select tags'
              showCounts
              />

          <TextField
            className='search'
            label='Search'
            type='search'
            margin='dense'
            onChange={this.handleChangeSearch}
            value={this.state.searchQuery}
          />
          <Fab
              color='primary'
              aria-label='Add'
              className='fab'
              onClick={() => this.setState({isAddDialogOpen: true})}>
            <AddIcon />
          </Fab>
          {this.state.isAddDialogOpen ?
            <Transactions.AddTransactionDialog
                onClose={() => this.setState({isAddDialogOpen: false})}
                onSaveChanges={this.handleAddTransaction}
            /> : undefined}
        </div>
        {this.props.transactions.length
            ? <Transactions.TransactionsTable
                  classes={{root: classes.transactionsTable}}
                  lazyRender>
                <Transactions.TransactionsTableSumRow
                    transactions={visibleTransactions}
                    selectAllChecked={visibleTransactions.length == this.state.selectedTransactions.size}
                    onSelectAllClick={this.handleSelectAllClick}
                    />
                {rows}
              </Transactions.TransactionsTable>
            : <div className={classes.loadingContainer}><CircularProgress /></div>}
    </div>);
  }

  private handleChangeStartDate = (d: MaterialUiPickersDate): void => {
    if (!d) {
      return;
    }
    let startDate = d.toDate();
    this.setState({
      startDate,
      selectedTransactions: new Map(),
    });
  }

  private handleChangeEndDate = (d: MaterialUiPickersDate): void => {
    if (!d) {
      return;
    }
    let endDate = d.toDate();
    this.setState({
      endDate,
      selectedTransactions: new Map(),
    });
  }

  private handleChangeTagFilter = (tagFilters: string[]): void => {
    this.setState({
      tagFilters,
      selectedTransactions: new Map(),
    });
  }

  private handleChangeSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    let searchQuery = event.target.value;
    this.setState({
      searchQuery,
      selectedTransactions: new Map(),
    });
  }

  private handleSelectAllClick = (selectAll: boolean): void => {
    if (selectAll) {
      let selectedTransactions = new Map();
      let visibleTransactions = this.filterTransactions(
        this.props.transactions, this.state.startDate, this.state.endDate, this.state.tagFilters, this.state.searchQuery);
      visibleTransactions.forEach((t) => {
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

  private handleAddTransaction = (transaction: Transactions.ITransaction): void => {
    let transactions = [
      transaction,
      ...this.props.transactions,
    ];
    transactions.sort(Transactions.TransactionUtils.compareTransactions);
    this.props.updateTransactions(transactions);

    let transactionDate = moment(transaction.date).toDate();
    this.setState({
      tagFilters: [],
      searchQuery: '',
      startDate: this.state.startDate > transactionDate ? transactionDate : this.state.startDate,
      endDate: this.state.endDate < transactionDate ? transactionDate : this.state.endDate,
    });
  }

  private handleEditTransaction = (updatedTransaction: Transactions.ITransaction): void => {
    this.props.updateTransactions(this.props.transactions.map(t => (
      t.id == updatedTransaction.id ? updatedTransaction : t
    )));
    this.setState({
      selectedTransactions: new Map(),
    });
  }

  private handleBatchEditTags = (updatedTransactions: Transactions.ITransaction[]) => {
    let updatedTransactionsMap = new Map(updatedTransactions.map(
        (t): [string, Transactions.ITransaction] => [t.id, t]));
    this.props.updateTransactions(this.props.transactions.map(t => (
      updatedTransactionsMap.get(t.id) || t
    )));

    // Since clearning/removing tags can change the tagFilter results,
    // reset it.
    this.setState({
      tagFilters: [],
      selectedTransactions: new Map(),
    });
  }

  private handleMergeSelectedTransactions = (transaction: Transactions.ITransaction): void => {
    let fromTransactions = this.state.selectedTransactions;
    fromTransactions.delete(transaction.id);
    let selectedTransactions = new Map();
    let transactionsToKeep: Transactions.ITransaction[] = [];
    for (let t of this.props.transactions) {
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
    this.props.updateTransactions(transactionsToKeep);
    this.setState({
      selectedTransactions,
    });
  }

  private handleDeleteTransactions = (transactionsToDelete: Map<string, Transactions.ITransaction>): void => {
    let transactionsToKeep = this.props.transactions.filter((t: Transactions.ITransaction) => {
      return !transactionsToDelete.has(t.id);
    });
    this.props.updateTransactions(transactionsToKeep);
    this.setState({
      selectedTransactions: new Map(),
    });
  }

  private handleSplitTransaction = (newTransactions: Map<string, Transactions.ITransaction>): void => {
    let transactionsToKeep = this.props.transactions.filter((t: Transactions.ITransaction) => {
      return !this.state.selectedTransactions.has(t.id);
    });
    let selectedTransactions = new Map();
    for (let transaction of newTransactions.values()) {
      transactionsToKeep.push(transaction);
      selectedTransactions.set(transaction.id, transaction);
    }
    transactionsToKeep.sort(Transactions.TransactionUtils.compareTransactions);
    this.props.updateTransactions(transactionsToKeep);
    this.setState({
      selectedTransactions,
    });
  }

  private handleClearSelections = (): void => {
    this.setState({
      selectedTransactions: new Map(),
    });
  }

  // tslint:disable-next-line:member-ordering (this is a function, not a field)
  private filterTransactions: filterTransactionsFunction = memoize<filterTransactionsFunction>(
      (transactions, startDate, endDate, tagFilters, searchQuery) => {
    return Transactions.TransactionUtils.filterTransactions(
        transactions,
        {
          startDate: startDate || this.state.startDate,
          endDate: endDate || this.state.endDate,
          tagsIncludeAll: new Array(...tagFilters),
          searchQuery,
        });
  });
});

const mapStateToProps = (state: IAppState): IEditorAppStateProps => ({
  transactions: state.transactions.transactions,
  cloudState: state.transactions.cloudState,
});
const mapDispatchToProps = (dispatch: ThunkDispatch<IAppState, null, any>): IEditorDispatchProps => ({
  fetchTransactions: () => {
    dispatch(Transactions.TransactionsActions.fetchTransactionsFromDropboxIfNeeded());
  },
  updateTransactions: (transactions) => {
    dispatch(Transactions.TransactionsActions.updateTransactions(transactions));
  },
  saveTransactions: () => {
    dispatch(Transactions.TransactionsActions.saveTransactionsToDropbox());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
