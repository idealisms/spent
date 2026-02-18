import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { Theme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { ITransaction } from '../model';
import * as TransactionUtils from '../utils';
import TagSelect from './TagSelect';
import Transaction from './Transaction';
import TransactionsTable from './TransactionsTable';

export enum BatchEditTagsAction {
  SetTags = 'set',
  AddTags = 'add',
  RemoveTags = 'remove',
}

const useStyles = makeStyles()((_theme: Theme) => ({
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
}));
interface IBatchEditTagsDialogProps {
  transactions: ITransaction[];
  onClose: () => void;
  onSaveChanges: (updatedTransactions: ITransaction[]) => void;
}
interface IBatchEditTagsDialogState {
  action?: BatchEditTagsAction;
  tags: string[];
}

interface IBatchEditTagsDialogInnerProps extends IBatchEditTagsDialogProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class BatchEditTagsDialogInner extends React.Component<
  IBatchEditTagsDialogInnerProps,
  IBatchEditTagsDialogState
> {
  constructor(props: IBatchEditTagsDialogInnerProps) {
    super(props);
    let sortedTransactions = [...props.transactions];
    sortedTransactions.sort(TransactionUtils.compareTransactions);
    this.state = {
      tags: [],
    };
  }

  public render(): React.ReactElement<Record<string, unknown>> {
    let classes = this.props.classes;
    let rows = this.props.transactions.map(t => {
      return <Transaction key={t.id} transaction={t} hideDate />;
    });

    return (
      <Dialog
        open
        onClose={this.props.onClose}
        classes={{ paper: classes.dialogPaper }}
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle>Batch Edit Tags</DialogTitle>
        <DialogContent>
          <div className={classes.controls}>
            <RadioGroup
              name="batch-edit-action"
              onChange={this.handleChangeAction}
            >
              <FormControlLabel
                value={BatchEditTagsAction.SetTags}
                label={'Set'}
                control={<Radio color="primary" />}
              />
              <FormControlLabel
                value={BatchEditTagsAction.AddTags}
                label={'Add'}
                control={<Radio color="primary" />}
              />
              <FormControlLabel
                value={BatchEditTagsAction.RemoveTags}
                label={'Remove'}
                control={<Radio color="primary" />}
              />
            </RadioGroup>
            <TagSelect
              onChange={this.handleChangeTagSelect}
              value={this.state.tags}
              transactions={
                this.state.action == BatchEditTagsAction.RemoveTags
                  ? this.props.transactions
                  : undefined
              }
              allowNewTags
              className="tagselect"
              isDisabled={this.state.action === undefined}
              createOptionPosition="first"
              placeholder={
                this.state.action ? this.state.action + ' tag(s)' : ''
              }
            />
          </div>
          <TransactionsTable classes={{ root: classes.transactionsTableRoot }}>
            {rows}
          </TransactionsTable>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={this.props.onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            disabled={this.isApplyDisabled()}
            onClick={this.handleBatchEditTags}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private handleChangeAction = (_event: any, action: string) => {
    this.setState({
      action: action as BatchEditTagsAction,
    });
  };

  private handleChangeTagSelect = (tags: string[]): void => {
    this.setState({
      tags,
    });
  };

  private handleBatchEditTags = (): void => {
    let updatedTransactions: ITransaction[] = [];
    if (this.state.action == BatchEditTagsAction.SetTags) {
      updatedTransactions = this.props.transactions.map(t => ({
        ...t,
        tags: [...this.state.tags],
      }));
    } else if (this.state.action == BatchEditTagsAction.AddTags) {
      updatedTransactions = this.props.transactions.map(t => {
        let newTransaction = { ...t };
        for (let tag of this.state.tags) {
          if (newTransaction.tags.indexOf(tag) == -1) {
            newTransaction.tags.push(tag);
          }
        }
        return newTransaction;
      });
    } else if (this.state.action == BatchEditTagsAction.RemoveTags) {
      let tagsSet = new Set(this.state.tags);
      updatedTransactions = this.props.transactions.map(t => {
        let newTransaction = { ...t };
        newTransaction.tags = newTransaction.tags.filter(
          tag => !tagsSet.has(tag)
        );
        return newTransaction;
      });
    }

    if (this.state.action) {
      this.props.onSaveChanges(updatedTransactions);
    }

    this.props.onClose();
  };

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
  };
}

function BatchEditTagsDialogWrapper(props: IBatchEditTagsDialogProps) {
  const { classes } = useStyles();
  return <BatchEditTagsDialogInner {...props} classes={classes} />;
}

export default BatchEditTagsDialogWrapper;
