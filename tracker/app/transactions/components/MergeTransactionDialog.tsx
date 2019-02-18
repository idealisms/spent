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
import { ITransaction } from '../Model';
import { compareTransactions } from '../utils';
import Transaction from './Transaction';
import TransactionsTable from './TransactionsTable';

const styles = (theme: Theme) => createStyles({
  mergeRadioButton: {
    '& > div': {
      align: 'center',
    },
  },
  transactionsTable: {
    borderTop: 'none',
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
});
interface IMergeTransactionDialogProps extends WithStyles<typeof styles> {
  transactions: ITransaction[];
  onClose: () => void;
  onSaveChanges: (transaction: ITransaction) => void;
}
interface IMergeTransactionDialogState {
  selectedTransactionId?: string;
  transactions: ITransaction[];
}
const MergeTransactionDialog = withStyles(styles)(
class extends React.Component<IMergeTransactionDialogProps, IMergeTransactionDialogState> {

  constructor(props: IMergeTransactionDialogProps, context?: any) {
    super(props, context);
    let sortedTransactions = [...props.transactions];
    sortedTransactions.sort(compareTransactions);
    this.state = {
      transactions: sortedTransactions,
    };
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let rows: JSX.Element[] = [];
    for (let transaction of this.state.transactions) {
      let label =
          <TransactionsTable classes={{root: classes.transactionsTable}}>
            <Transaction
                transaction={transaction}
                hideDate={true}
                hideTags={true}
                classes={{
                    row: classes.transactionRow,
                    description: classes.transactionDescription,
                    amount: classes.transactionAmount,
                }} />
          </TransactionsTable>;
      rows.push(
          <FormControlLabel
              key={'radio-' + transaction.id}
              value={transaction.id}
              label={label}
              control={<Radio color='primary'/>}
              className={classes.mergeRadioButton} />,
      );
    }

    return <Dialog
            open={true}
            onClose={this.props.onClose}
            scroll='paper'>
        <DialogTitle>{'Choose transaction to merge into'}</DialogTitle>
        <DialogContent>
        <RadioGroup
            name='merge-group'
            onChange={(event: any, transactionId: string) => this.handleChangeSelection(transactionId)}>
          {rows}
        </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button color='primary' onClick={this.props.onClose}>Cancel</Button>
          <Button
              color='primary'
              disabled={!this.state.selectedTransactionId}
              onClick={() => this.handleMerge() }>
            Merge
          </Button>
        </DialogActions>
      </Dialog>;
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
});

export default MergeTransactionDialog;
