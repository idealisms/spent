import { createStyles, WithStyles } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { Theme, withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import * as React from 'react';
import { ITransaction } from '../Model';
import { compareTransactions, generateUUID } from '../utils';
import Transaction from './Transaction';

const styles = (theme: Theme) => createStyles({
  amount: {
    flex: '0 0 80px',
    // This fixes the vertical alignment of the input.
    paddingTop: '8px',
    '& input': {
      textAlign: 'right',
    },
  },
});

interface ISplitTransactionDialogProps extends WithStyles<typeof styles> {
  transaction: ITransaction;
  onClose: () => void;
  onSaveChanges: (transactions: Map<string, ITransaction>) => void;
}
type ISplitTransactionRow = ITransaction & {
  amountString?: string,
};
type ISplitTransactionDialogState = {
  transactions: ISplitTransactionRow[],
  wasMerged: boolean,
  isEditing: boolean,
};

export const SplitTransactionDialog = withStyles(styles)(
class extends React.Component<ISplitTransactionDialogProps, ISplitTransactionDialogState> {

  constructor(props: ISplitTransactionDialogProps, context?: any) {
    super(props, context);
    let transactions: ISplitTransactionRow[] = [];
    let wasMerged = false;
    if ((props.transaction.transactions || []).length > 1) {
      transactions = [...props.transaction.transactions];
      transactions.sort(compareTransactions);
      wasMerged = true;
    } else {
      transactions = [
        {
          id: props.transaction.id,
          description: props.transaction.description,
          original_line: props.transaction.original_line,
          date: props.transaction.date,
          tags: [...props.transaction.tags],
          amount_cents: Math.round(props.transaction.amount_cents / 2),
          transactions: [],
          source: props.transaction.source,
          notes: props.transaction.notes,
        },
        {
          id: generateUUID(),
          description: props.transaction.description,
          original_line: props.transaction.original_line,
          date: props.transaction.date,
          tags: [...props.transaction.tags],
          amount_cents: props.transaction.amount_cents - Math.round(props.transaction.amount_cents / 2),
          transactions: [],
          source: `split:${props.transaction.id}`,
          notes: props.transaction.notes,
        },
      ];
    }
    transactions.map((t) => t.amountString = this.formatAmountNumeric(t.amount_cents));

    this.state = {
      transactions,
      wasMerged,
      isEditing: false,
    };
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let totalAmountCents = 0;
    this.state.transactions.map((t) => totalAmountCents += t.amount_cents);

    let rows: JSX.Element[] = [];
    for (let transaction of this.state.transactions) {
      rows.push(
        <Transaction
          transaction={transaction}
          key={`split-${transaction.id}`}
          hideDate={true}
          hideTags={true}
          amountFragment={
              <React.Fragment>
                <div>$</div>
                <TextField
                  className={classes.amount}
                  value={transaction.amountString}
                  name={transaction.id}
                  onChange={(event) => this.handleChange(event.target as HTMLInputElement)}
                  onBlur={(event) => this.handleBlur(event.target as HTMLInputElement)}
                  disabled={this.state.wasMerged} />
              </React.Fragment>}
          />);
    }

    return <Dialog
          open={true}
          onClose={this.props.onClose}
          scroll='paper'
          >
        <DialogTitle>{'Choose transaction to split into'}</DialogTitle>
        <DialogContent className='transactions' style={{padding: 0, margin: '0 24px 24px'}}>
          {rows}
        </DialogContent>
        <DialogActions>
          <Button color='primary' onClick={this.props.onClose}>Cancel</Button>
          <Button
              color='primary'
              disabled={this.state.isEditing || (totalAmountCents != this.props.transaction.amount_cents)}
              onClick={() => this.handleSplit() }>
            Split
          </Button>
        </DialogActions>
      </Dialog>;
  }

  private handleChange(input: HTMLInputElement): void {
    let transactionId = input.name;
    for (let transaction of this.state.transactions) {
      if (transaction.id == transactionId) {
        transaction.amountString = input.value;
        break;
      }
    }
    this.setState({
      transactions: this.state.transactions,
      isEditing: true,
    });
  }

  private handleBlur(input: HTMLInputElement): void {
    let transactionId = input.name;
    if (this.state.transactions.length != 2) {
      console.error('only expect to edit splits into 2');
      return;
    }

    let modifiedTransaction, otherTransaction;
    if (transactionId == this.state.transactions[0].id) {
      modifiedTransaction = this.state.transactions[0];
      otherTransaction = this.state.transactions[1];
    } else {
      modifiedTransaction = this.state.transactions[1];
      otherTransaction = this.state.transactions[0];
    }

    let value = Math.round(Number(input.value) * 100);
    if (!isNaN(value)) {
      modifiedTransaction.amount_cents = value;
      otherTransaction.amount_cents = this.props.transaction.amount_cents - value;
      otherTransaction.amountString = this.formatAmountNumeric(otherTransaction.amount_cents);
    }
    modifiedTransaction.amountString = this.formatAmountNumeric(modifiedTransaction.amount_cents);

    this.setState({
      transactions: this.state.transactions,
      isEditing: false,
    });
  }

  private handleSplit(): void {
    let newTransactions: Map<string, ITransaction> = new Map();
    for (let transaction of this.state.transactions) {
      delete transaction.amountString;
      newTransactions.set(transaction.id, transaction);
    }
    this.props.onSaveChanges(newTransactions);

    this.props.onClose();
  }

  private formatAmountNumeric(amountCents: number): string {
    let amount: string = `${amountCents / 100}`;
    let pointIndex = amount.indexOf('.');
    if (pointIndex == -1) {
      amount += '.00';
    } else if (pointIndex == amount.length - 2) {
      amount += '0';
    }
    return amount;
  }
});
