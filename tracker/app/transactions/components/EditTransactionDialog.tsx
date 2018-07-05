import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import * as React from 'react';
import { EMPTY_TRANSACTION, ITransaction } from '../Model';

type IEditTransactionDialogProps = {
  transaction?: ITransaction,
  isOpen: boolean,
  onClose: () => void,
  onSaveChanges: (transaction: ITransaction) => void,
  onPendingEditChanges?: (transaction: ITransaction) => void,
};
type IEditTransactionDialogState = {
};
export class EditTransactionDialog extends React.Component<IEditTransactionDialogProps, IEditTransactionDialogState> {

  public render(): React.ReactElement<object> {
    const actions = [
      <FlatButton
        label='Cancel'
        primary={true}
        onClick={this.props.onClose}
      />,
      <FlatButton
        label='Save'
        primary={true}
        keyboardFocused={true}
        onClick={() => {
          this.props.onSaveChanges(this.props.transaction!);
          this.props.onClose();
        }}
      />,
    ];

    let transaction: ITransaction = this.props.transaction || EMPTY_TRANSACTION;
    return <Dialog
          title='Edit Transaction'
          actions={actions}
          modal={false}
          open={this.props.isOpen}
          onRequestClose={this.props.onClose}
          autoScrollBodyContent={true}>
        {transaction.description} {transaction.amount_cents}
      </Dialog>;
  }
}
