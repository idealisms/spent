import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';
import * as React from 'react';
import { Category, ITransaction } from '../Model';
import { categoryToEmoji, compareTransactions, formatAmount, getCategory } from '../utils';

type IMergeTransactionDialogProps = {
  transactions: ITransaction[],
  onClose: () => void,
  onSaveChanges: (transaction: ITransaction) => void,
};
type IMergeTransactionDialogState = {
  selectedTransactionId?: string,
  transactions: ITransaction[],
};
export class MergeTransactionDialog extends React.Component<IMergeTransactionDialogProps, IMergeTransactionDialogState> {

  constructor(props: IMergeTransactionDialogProps, context: any) {
    super(props, context);
    let sortedTransactions = [...props.transactions];
    sortedTransactions.sort(compareTransactions);
    this.state = {
      transactions: sortedTransactions,
    };
  }

  public render(): React.ReactElement<object> {
    const actions = [
      <FlatButton
        label='Cancel'
        primary={true}
        onClick={this.props.onClose}
      />,
      <FlatButton
        label='Merge'
        primary={true}
        disabled={!this.state.selectedTransactionId}
        onClick={() => this.handleMerge() }
      />,
    ];
    let rows: JSX.Element[] = [];
    for (let transaction of this.state.transactions) {
      let isCredit = transaction.amount_cents < 0;
      let categoryEmoji = '🙅';
      let categoryName = 'error';
      try {
        let category = getCategory(transaction);
        categoryEmoji = categoryToEmoji(category);
        categoryName = Category[category];
      } catch(e) {
        console.log(e);
      }
      let label =
          <div className='transactions'>
            <div className='row'>
              <div className={'amount' + (isCredit ? ' credit' : '')}>{formatAmount(transaction)}</div>
              <div className='category' title={categoryName}>{categoryEmoji}</div>
              <div className='description'>
                {transaction.description}
                {transaction.notes ? <span className='notes'> - {transaction.notes}</span> : ''}
              </div>
            </div>
          </div>;
      rows.push(
          <RadioButton
              key={'radio-' + transaction.id}
              value={transaction.id}
              label={label}
              className={'merge-radio-button'} />,
      );
    }

    return <Dialog
          className='merge-transaction-dialog'
          title='Choose transaction to merge into'
          actions={actions}
          modal={false}
          open={true}
          onRequestClose={this.props.onClose}
          autoScrollBodyContent={true}>
        <RadioButtonGroup
            name='merge-group'
            onChange={(event: any, transactionId: string) => this.handleChangeSelection(transactionId)}>
          {rows}
        </RadioButtonGroup>
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
}
