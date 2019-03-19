import { createStyles, WithStyles } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import CreatableSelect from 'react-select/lib/Creatable';
import { ValueType } from 'react-select/lib/types';
import { ITransaction } from '../Model';
import * as TransactionUtils from '../utils';
import Transaction from './Transaction';
import TransactionsTable from './TransactionsTable';

export enum BatchEditTagsAction {
  SetTags = 'set',
  AddTags = 'add',
  RemoveTags = 'remove',
}

const styles = (theme: Theme) => createStyles({
  dialogPaper: {
    margin: '16px',
  },
  controls: {
    display: 'flex',
    alignItems: 'start',
    '& .tagselect': {
      flex: '1 0 180px',
    },
  },
  transactionsTableRoot: {
    borderTop: '1px solid lightgrey',
    maxHeight: '50vh',
    overflow: 'auto',
  },
});
interface IBatchEditTagsDialogProps extends WithStyles<typeof styles> {
  transactions: ITransaction[];
  onClose: () => void;
  onSaveChanges: (updatedTransactions: ITransaction[]) => void;
}
interface IBatchEditTagsDialogState {
  action?: BatchEditTagsAction;
  tags: ValueType<{label: string, value: string}>;
}
const BatchEditTagsDialog = withStyles(styles)(
class extends React.Component<IBatchEditTagsDialogProps, IBatchEditTagsDialogState> {

  constructor(props: IBatchEditTagsDialogProps, context?: any) {
    super(props, context);
    let sortedTransactions = [...props.transactions];
    sortedTransactions.sort(TransactionUtils.compareTransactions);
    this.state = {
      tags: null,
    };
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let tagSuggestions = TransactionUtils.getTagsForSuggestions(this.props.transactions);
    let rows = this.props.transactions.map((t) => {
        return (
          <Transaction
              key={t.id}
              transaction={t}
              hideDate
              />
        );
      });

    return <Dialog
            open
            onClose={this.props.onClose}
            classes={{paper: classes.dialogPaper}}
            maxWidth='md'
            scroll='paper'>
        <DialogTitle>Batch Edit Tags</DialogTitle>
        <DialogContent>
          <div className={classes.controls}>
            <RadioGroup
                name='batch-edit-action'
                onChange={this.handleChangeAction}>
              <FormControlLabel
                  value={BatchEditTagsAction.SetTags}
                  label={'Set'}
                  control={<Radio color='primary'/>} />
              <FormControlLabel
                  value={BatchEditTagsAction.AddTags}
                  label={'Add'}
                  control={<Radio color='primary'/>} />
              <FormControlLabel
                  value={BatchEditTagsAction.RemoveTags}
                  label={'Remove'}
                  control={<Radio color='primary'/>} />
            </RadioGroup>
            <CreatableSelect
                className='tagselect'
                value={this.state.tags}
                onChange={this.handleChangeTagSelect}
                options={tagSuggestions}
                isDisabled={this.state.action === undefined}
                formatCreateLabel={(inputValue) => <span>New tag: {inputValue}</span>}
                createOptionPosition='first'
                placeholder={this.state.action ? this.state.action + ' tag(s)' : ''}
                isMulti />
          </div>
          <TransactionsTable classes={{root: classes.transactionsTableRoot}}>
            {rows}
          </TransactionsTable>
        </DialogContent>
        <DialogActions>
          <Button color='primary' onClick={this.props.onClose}>Cancel</Button>
          <Button
              color='primary'
              disabled={this.isApplyDisabled()}
              onClick={this.handleBatchEditTags}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>;
  }

  private handleChangeAction = (event: any, action: string) => {
    this.setState({
      action: action as BatchEditTagsAction,
    });
  }

  private handleChangeTagSelect = (tags: ValueType<{label: string, value: string}>, action: any): void => {
    this.setState({
      tags,
    });
  }

  private handleBatchEditTags = (): void => {
    let tags: Set<string> = new Set();
    if (Array.isArray(this.state.tags)) {
      this.state.tags.forEach((value) => tags.add(value.value));
    }

    let updatedTransactions: ITransaction[] = [];
    if (this.state.action == BatchEditTagsAction.SetTags) {
      updatedTransactions = this.props.transactions.map((t) => ({
        ...t,
        tags: [...tags],
      }));
      for (let t of this.props.transactions.values()) {
        t.tags = new Array(...tags);
      }
    } else if (this.state.action == BatchEditTagsAction.AddTags) {
      updatedTransactions = this.props.transactions.map((t) => {
        let newTransaction = {...t};
        for (let tag of tags) {
          if (newTransaction.tags.indexOf(tag) == -1) {
            newTransaction.tags.push(tag);
          }
        }
        return newTransaction;
      });
    } else if (this.state.action == BatchEditTagsAction.RemoveTags) {
      updatedTransactions = this.props.transactions.map((t) => {
        let newTransaction = {...t};
        newTransaction.tags = newTransaction.tags.filter((tag) => !tags.has(tag));
        return newTransaction;
      });
    }

    if (this.state.action) {
      this.props.onSaveChanges(updatedTransactions);
    }

    this.props.onClose();
  }

  private isApplyDisabled = (): boolean => {
    if (this.state.action === undefined) {
      return true;
    }
    if (this.state.action != BatchEditTagsAction.SetTags) {
      let numTags = Array.isArray(this.state.tags) ? this.state.tags.length : 0;
      if (numTags == 0) {
        return true;
      }
    }
    return false;
  }
});

export default BatchEditTagsDialog;
