import { createStyles, TextField, WithStyles } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import { Theme, withStyles } from '@material-ui/core/styles';
import { InlineDatePicker } from 'material-ui-pickers';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import { ValueType } from 'react-select/lib/types';
import { ThunkDispatch } from 'redux-thunk';
import * as Transactions from '../../transactions';
import { CloudState, IAppState } from '../Model';
import MenuBar from './MenuBar';

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
  // visibleTransactions is derived state. Remove it and if it's slow, use memoize-one.
  visibleTransactions: Transactions.ITransaction[];
  startDate: Date;
  endDate: Date;
  selectedTransactions: Map<string, Transactions.ITransaction>;
  tagFilters: ValueType<{label: string, value: string}>;
  searchQuery: string;
}

const Editor = withStyles(styles)(
class extends React.Component<IEditorProps, IEditorState> {
  constructor(props: IEditorProps, context?: any) {
    super(props, context);

    let state: IEditorState = {
      visibleTransactions: [],
      startDate: moment().subtract(3, 'months').toDate(),
      endDate: moment().hours(0).minutes(0).seconds(0).milliseconds(0).toDate(),
      selectedTransactions: new Map(),
      tagFilters: [],
      searchQuery: '',
    };

    this.state = this.initState(state);
    this.props.fetchTransactions();
  }

  public componentDidUpdate(prevProps: IEditorProps): void {
    if (this.props.transactions !== prevProps.transactions) {
      if (prevProps.transactions.length == 0) {
        this.setState({
          ...this.initState(this.state),
          selectedTransactions: new Map(),
        });
      } else {
        this.setState({
          visibleTransactions: this.filterTransactions(this.props.transactions),
        });
      }
    }
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
    if (this.props.transactions.length > 0) {
      minDate = moment(this.props.transactions.slice(-1)[0].date).toDate();
      maxDate = moment(this.props.transactions[0].date).toDate();
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
        {this.props.transactions.length
            ? <Transactions.TransactionsTable
                  classes={{root: classes.transactionsTable}}
                  lazyRender>
                <Transactions.TransactionsTableSumRow
                    transactions={this.state.visibleTransactions}
                    selectAllChecked={this.state.visibleTransactions.length == this.state.selectedTransactions.size}
                    onSelectAllClick={this.handleSelectAllClick}
                    />
                {rows}
              </Transactions.TransactionsTable>
            : <div className={classes.loadingContainer}><CircularProgress /></div>}
    </div>);
  }

  private handleChangeStartDate = (m: moment.Moment): void => {
    let startDate = m.toDate();
    this.setState({
      startDate,
      visibleTransactions: this.filterTransactions(this.props.transactions, startDate),
      selectedTransactions: new Map(),
    });
  }

  private handleChangeEndDate = (m: moment.Moment): void => {
    let endDate = m.toDate();
    this.setState({
      endDate,
      visibleTransactions: this.filterTransactions(this.props.transactions, undefined, endDate),
      selectedTransactions: new Map(),
    });
  }

  private handleChangeTagFilter = (tagFilters: ValueType<{label: string, value: string}>, action: any): void => {
    this.setState({
      tagFilters: tagFilters,
      visibleTransactions: this.filterTransactions(
          this.props.transactions, undefined, undefined, tagFilters),
      selectedTransactions: new Map(),
    });
  }

  private handleChangeSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    let searchQuery = event.target.value;
    this.setState({
      searchQuery,
      visibleTransactions: this.filterTransactions(
          this.props.transactions, undefined, undefined, undefined, searchQuery),
      selectedTransactions: new Map(),
    });
  }

  private handleSelectAllClick = (selectAll: boolean): void => {
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
      tagFilters: null,
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

  private initState(state: IEditorState): IEditorState {
    if (this.props.transactions.length) {
      const transactions = this.props.transactions;
      let startDate = moment(transactions[transactions.length - 1].date).toDate();
      let endDate = moment(transactions[0].date).toDate();
      return {
          ...state,
          startDate,
          endDate,
          visibleTransactions: this.filterTransactions(
              transactions, startDate, endDate, state.tagFilters, state.searchQuery),
      };
    }
    return state;
  }

  private filterTransactions(
        transactions: Transactions.ITransaction[],
        startDate?: Date,
        endDate?: Date,
        tagFilters?: ValueType<{label: string, value: string}>,
        searchQuery?: string): Transactions.ITransaction[] {
    tagFilters = (tagFilters === undefined) ? this.state.tagFilters : tagFilters;
    let tagsInclude = (Array.isArray(tagFilters) && tagFilters.length > 0)
        ? tagFilters.map(valueType => valueType.value)
        : [];
    return Transactions.TransactionUtils.filterTransactions(
        transactions,
        {
          startDate: startDate || this.state.startDate,
          endDate: endDate || this.state.endDate,
          tagsIncludeAll: tagsInclude,
          searchQuery,
        });
  }
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
