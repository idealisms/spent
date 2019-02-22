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
import { isUndefined } from 'util';
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
  onSaveChanges: () => void;
}
interface IBatchEditTagsDialogState {
  action?: BatchEditTagsAction;
  tags: ValueType<{label: string, value: string}>;
}
export const BatchEditTagsDialog = withStyles(styles)(
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
    let tags = TransactionUtils.getTags(this.props.transactions);
    let tagSuggestions = new Array(...tags).sort().map(
        (t) => ({label: t, value: t}),
        tags);
    let rows = this.props.transactions.map((t) => {
        return (
          <Transaction
              key={t.id}
              transaction={t}
              hideDate={true}
              />
        );
      });

    return <Dialog
            open={true}
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
                isDisabled={isUndefined(this.state.action)}
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
    let tags = new Set();
    if (Array.isArray(this.state.tags)) {
      this.state.tags.forEach((value) => tags.add(value.value));
    }

    if (this.state.action == BatchEditTagsAction.SetTags) {
      for (let t of this.props.transactions.values()) {
        t.tags = new Array(...tags);
      }
    } else if (this.state.action == BatchEditTagsAction.AddTags) {
      for (let t of this.props.transactions.values()) {
        for (let tag of tags) {
          if (t.tags.indexOf(tag) == -1) {
            t.tags.push(tag);
          }
        }
      }
    } else if (this.state.action == BatchEditTagsAction.RemoveTags) {
      for (let t of this.props.transactions.values()) {
        t.tags = t.tags.filter((tag) => !tags.has(tag));
      }
    }

    if (this.state.action) {
      this.props.onSaveChanges();
    }

    this.props.onClose();
  }

  private isApplyDisabled = (): boolean => {
    if (isUndefined(this.state.action)) {
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
