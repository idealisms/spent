import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { Theme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { ITransaction, TagSelect } from '../../transactions';
import { classifyUtils } from '../../transactions';
import Transaction from '../../transactions/components/Transaction';
import TransactionsTable from '../../transactions/components/TransactionsTable';

const useStyles = makeStyles()((_theme: Theme) => ({
  dialogPaper: {
    width: 'calc(100% - 64px)',
  },
  transactionRow: {
    borderBottom: 'none',
  },
  transactionAmount: {
    flex: '0 0 auto',
    marginLeft: 0,
  },
  tagSelect: {
    marginTop: '16px',
    width: '100%',
  },
  progress: {
    marginLeft: '8px',
    color: 'rgba(0,0,0,0.45)',
    fontSize: '0.85em',
    fontWeight: 'normal',
  },
}));

interface IClassifyDialogProps {
  open: boolean;
  /** All untagged transactions, newest-first. */
  transactions: ITransaction[];
  /** Full transaction history, for tag suggestions. */
  allTransactions: ITransaction[];
  onSave: (updated: ITransaction) => void;
  onClose: () => void;
}

interface IClassifyDialogState {
  currentIndex: number;
  currentTags: string[];
}

interface IClassifyDialogInnerProps extends IClassifyDialogProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class ClassifyDialogInner extends React.Component<
  IClassifyDialogInnerProps,
  IClassifyDialogState
> {
  constructor(props: IClassifyDialogInnerProps) {
    super(props);
    this.state = {
      currentIndex: 0,
      currentTags: this.getSuggestion(0),
    };
  }

  public componentDidUpdate(prevProps: IClassifyDialogInnerProps): void {
    if (!prevProps.open && this.props.open) {
      this.setState({
        currentIndex: 0,
        currentTags: this.getSuggestion(0),
      });
      return;
    }
    // After confirming, the confirmed transaction is removed from props.transactions.
    // Re-evaluate at the same index (which now points to the next transaction).
    if (prevProps.transactions !== this.props.transactions && this.props.open) {
      const { currentIndex } = this.state;
      if (currentIndex >= this.props.transactions.length) {
        this.props.onClose();
      } else {
        this.setState({ currentTags: this.getSuggestion(currentIndex) });
      }
    }
  }

  public render(): React.ReactElement {
    const { open, transactions, onClose, classes } = this.props;
    const { currentIndex, currentTags } = this.state;

    if (transactions.length === 0) {
      return (
        <Dialog open={open} onClose={onClose} classes={{ paper: classes.dialogPaper }}>
          <DialogTitle>Classify</DialogTitle>
          <DialogContent>
            <Typography>All transactions are tagged.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} variant="contained">Close</Button>
          </DialogActions>
        </Dialog>
      );
    }

    const transaction = transactions[currentIndex];

    return (
      <Dialog open={open} onClose={onClose} classes={{ paper: classes.dialogPaper }}>
        <DialogTitle>
          Classify
          <span className={classes.progress}>
            {currentIndex + 1} of {transactions.length}
          </span>
        </DialogTitle>
        <DialogContent>
          <TransactionsTable>
            <Transaction
              transaction={transaction}
              hideTags
              classes={{
                row: classes.transactionRow,
                amount: classes.transactionAmount,
              }}
            />
          </TransactionsTable>
          <TagSelect
            onChange={tags => this.setState({ currentTags: tags })}
            value={currentTags}
            allowNewTags
            className={classes.tagSelect}
            placeholder="e.g. grocery, restaurant"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={this.handleBack} disabled={currentIndex === 0}>Back</Button>
          <Button onClick={this.handleSkip}>Skip</Button>
          <Button onClick={this.handleConfirm} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private getSuggestion(index: number): string[] {
    const { transactions, allTransactions } = this.props;
    if (index >= transactions.length) { return []; }
    return classifyUtils.suggestTags(allTransactions, transactions[index]);
  }

  private advance = () => {
    const nextIndex = this.state.currentIndex + 1;
    if (nextIndex >= this.props.transactions.length) {
      this.props.onClose();
    } else {
      this.setState({
        currentIndex: nextIndex,
        currentTags: this.getSuggestion(nextIndex),
      });
    }
  };

  private handleConfirm = () => {
    const transaction = this.props.transactions[this.state.currentIndex];
    this.props.onSave({ ...transaction, tags: this.state.currentTags });
    // Don't advance the index here. The saved transaction will be removed from
    // props.transactions (now tagged), so the same index naturally points to
    // the next transaction. componentDidUpdate handles the transition.
  };

  private handleBack = () => {
    const prevIndex = this.state.currentIndex - 1;
    this.setState({
      currentIndex: prevIndex,
      currentTags: this.getSuggestion(prevIndex),
    });
  };

  private handleSkip = () => {
    this.advance();
  };
}

export default function ClassifyDialog(props: IClassifyDialogProps) {
  const { classes } = useStyles();
  return <ClassifyDialogInner {...props} classes={classes} />;
}
