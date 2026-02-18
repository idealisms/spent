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
import { compareTransactions } from '../utils';
import Transaction from './Transaction';
import TransactionsTable from './TransactionsTable';

const useStyles = makeStyles()((_theme: Theme) => ({
  mergeRadioButton: {
    '& > div': {
      align: 'center',
    },
  },
  transactionRow: {
    borderBottom: 'none',
  },
  transactionDescription: {
    overflow: 'hidden',
    flex: '1 0 auto',
    paddingRight: '24px',
  },
  transactionAmount: {
    marginLeft: '0',
    flex: '0 0 73px',
  },
}));
interface IMergeTransactionDialogProps {
  transactions: ITransaction[];
  onClose: () => void;
  onSaveChanges: (transaction: ITransaction) => void;
}
interface IMergeTransactionDialogState {
  selectedTransactionId?: string;
  transactions: ITransaction[];
}

interface IMergeTransactionDialogInnerProps
  extends IMergeTransactionDialogProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class MergeTransactionDialogInner extends React.Component<
  IMergeTransactionDialogInnerProps,
  IMergeTransactionDialogState
> {
  constructor(props: IMergeTransactionDialogInnerProps) {
    super(props);
    let sortedTransactions = [...props.transactions];
    sortedTransactions.sort(compareTransactions);
    this.state = {
      transactions: sortedTransactions,
    };
  }

  public render(): React.ReactElement<Record<string, unknown>> {
    let classes = this.props.classes;
    let rows: JSX.Element[] = [];
    for (let transaction of this.state.transactions) {
      let label = (
        <TransactionsTable>
          <Transaction
            transaction={transaction}
            hideDate
            hideTags
            classes={{
              row: classes.transactionRow,
              description: classes.transactionDescription,
              amount: classes.transactionAmount,
            }}
          />
        </TransactionsTable>
      );
      rows.push(
        <FormControlLabel
          key={'radio-' + transaction.id}
          value={transaction.id}
          label={label}
          control={<Radio color="primary" />}
          className={classes.mergeRadioButton}
        />
      );
    }

    return (
      <Dialog open onClose={this.props.onClose} scroll="paper">
        <DialogTitle>{'Choose transaction to merge into'}</DialogTitle>
        <DialogContent>
          <RadioGroup
            name="merge-group"
            onChange={(_event: any, transactionId: string) =>
              this.handleChangeSelection(transactionId)
            }
          >
            {rows}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={this.props.onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            disabled={!this.state.selectedTransactionId}
            onClick={() => this.handleMerge()}
          >
            Merge
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private handleChangeSelection(transactionId: string): void {
    this.setState({
      selectedTransactionId: transactionId,
    });
  }

  private handleMerge(): void {
    let selectedTransaction: ITransaction | undefined = undefined;
    for (let transaction of this.state.transactions) {
      if (transaction.id == this.state.selectedTransactionId) {
        selectedTransaction = transaction;
      }
    }
    if (selectedTransaction) {
      this.props.onSaveChanges(selectedTransaction);
    }

    this.props.onClose();
  }
}

function MergeTransactionDialogWrapper(props: IMergeTransactionDialogProps) {
  const { classes } = useStyles();
  return <MergeTransactionDialogInner {...props} classes={classes} />;
}

export default MergeTransactionDialogWrapper;
