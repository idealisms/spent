import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
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
          <FormControlLabel
              key={'radio-' + transaction.id}
              value={transaction.id}
              label={label}
              control={<Radio color='primary'/>}
              className='merge-radio-button' />,
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
}
