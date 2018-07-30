import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import * as React from 'react';
import { Category, ITransaction } from '../Model';
import { categoryToEmoji, compareTransactions, generateUUID, getCategory } from '../utils';

type ISplitTransactionDialogProps = {
  transaction: ITransaction,
  onClose: () => void,
  onSaveChanges: (transactions: Map<string, ITransaction>) => void,
};
type ISplitTransactionRow = ITransaction & {
  amountString?: string,
};
type ISplitTransactionDialogState = {
  transactions: ISplitTransactionRow[],
  wasMerged: boolean,
  isEditing: boolean,
};

export class SplitTransactionDialog extends React.Component<ISplitTransactionDialogProps, ISplitTransactionDialogState> {

  constructor(props: ISplitTransactionDialogProps, context: any) {
    super(props, context);
    let transactions: ISplitTransactionRow[] = [];
    let wasMerged = false;
    if (props.transaction.transactions.length > 1) {
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
    let totalAmountCents = 0;
    this.state.transactions.map((t) => totalAmountCents += t.amount_cents);

    const actions = [
      <FlatButton
        label='Cancel'
        primary={true}
        onClick={this.props.onClose}
      />,
      <FlatButton
        label='Split'
        primary={true}
        disabled={this.state.isEditing || (totalAmountCents != this.props.transaction.amount_cents)}
        onClick={() => this.handleSplit() }
      />,
    ];
    let rows: JSX.Element[] = [];
    for (let transaction of this.state.transactions) {
      let categoryEmoji = '🙅';
      let categoryName = 'error';
      try {
        let category = getCategory(transaction);
        categoryEmoji = categoryToEmoji(category);
        categoryName = Category[category];
      } catch(e) {
        console.log(e);
      }
      rows.push(
        <div className='row' key={`split-${transaction.id}`}>
          <div>$</div>
          <TextField
            className='amount'
            value={transaction.amountString}
            inputStyle={{textAlign: 'right'}}
            name={transaction.id}
            onChange={(event) => this.handleChange(event.target as HTMLInputElement)}
            onBlur={(event) => this.handleBlur(event.target as HTMLInputElement)}
            disabled={this.state.wasMerged} />
          <div className='category' title={categoryName}>{categoryEmoji}</div>
          <div className='description'>
            {transaction.description}
            {transaction.notes ? <span className='notes'> - {transaction.notes}</span> : ''}
          </div>
        </div>);
    }

    return <Dialog
          className='split-transaction-dialog'
          title='Choose transaction to split into'
          actions={actions}
          modal={false}
          open={true}
          onRequestClose={this.props.onClose}
          autoScrollBodyContent={true}
          bodyStyle={{color: '#000'}}>
        <div className='transactions split'>
          {rows}
        </div>
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
}
