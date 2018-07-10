import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import * as React from 'react';
import { ITransaction } from '../Model';
import { formatAmount } from '../Module';

type IEditTransactionDialogProps = {
  transaction: ITransaction,
  isOpen: boolean,
  onClose: () => void,
  onSaveChanges: (transaction: ITransaction) => void,
};
type IEditTransactionDialogState = {
  tagsValue: string,
  notesValue: string,
};
export class EditTransactionDialog extends React.Component<IEditTransactionDialogProps, IEditTransactionDialogState> {

  constructor(props: IEditTransactionDialogProps, context: any) {
    super(props, context);
    this.state = {
      tagsValue: props.transaction.tags.join(', '),
      notesValue: props.transaction.notes || '',
    };
  }

  public render(): React.ReactElement<object> {
    const actions = [
      <FlatButton
        label='Cancel'
        primary={true}
        onClick={this.props.onClose}
      />,
      // TODO: Disable button unless there are changes.
      <FlatButton
        label='Save'
        primary={true}
        onClick={() => this.handleSave() }
      />,
    ];

    let transaction: ITransaction = this.props.transaction;
    return <Dialog
          className='edit-transaction-dialog'
          title='Edit Transaction'
          contentStyle={{width: 'calc(100% - 64px)', maxWidth: '360px'}}
          actions={actions}
          modal={false}
          open={this.props.isOpen}
          onRequestClose={this.props.onClose}
          autoScrollBodyContent={true}>
        <span className='amount'>{formatAmount(transaction)}</span>&nbsp;
        <span className='transaction'>{transaction.description}</span><br />
        <TextField
            hintText='e.g. food, restaurant'
            floatingLabelText='Tags (comma separated)'
            defaultValue={this.state.tagsValue}
            style={{width: '100%'}}
            onChange={(event) => this.setState({tagsValue: (event.target as HTMLInputElement).value})}
        /><br />
        <TextField
            floatingLabelText='Notes'
            defaultValue={this.state.notesValue}
            style={{width: '100%'}}
            onChange={(event) => this.setState({notesValue: (event.target as HTMLInputElement).value})}
        />
      </Dialog>;
  }

  private handleSave(): void {
    let transaction: ITransaction = {...this.props.transaction};
    transaction.notes = this.state.notesValue.trim();
    transaction.tags = [];
    // Remove trailing commas and spaces.
    let tagsValue = this.state.tagsValue.replace(/([, ]+$)/g, '');
    tagsValue.split(',').forEach((tag) => {
        tag = tag.trim();
        if (tag !== '') {
            transaction.tags.push(tag);
        }
    });
    transaction.tags = transaction.tags;

    this.props.onSaveChanges(transaction);
    this.props.onClose();
  }
}
