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
import Transaction from './Transaction';
import TransactionsTable from './TransactionsTable';

const styles = (theme: Theme) => createStyles({
  dialogRoot: {
    '@media (max-height: 380px)': {
      marginTop: '-40px',
      marginBottom: '-40px',
    },
    '& .transaction': {
      lineHeight: '32px',
    },
    '& .textfield': {
      marginTop: '16px',
    },
  },
  dialogPaper: {
    width: 'calc(100% - 64px)',
    maxWidth: '360px',
  },
  transactionAmount: {
    flex: '0 0 auto',
    marginLeft: 0,
  },
  transactionRow: {
    borderBottom: 'none',
  },
});

interface IEditTransactionDialogProps extends WithStyles<typeof styles> {
  transaction: ITransaction;
  onClose: () => void;
  onSaveChanges: (transaction: ITransaction) => void;
}
interface IEditTransactionDialogState {
  tagsValue: string;
  notesValue: string;
}
const EditTransactionDialog = withStyles(styles)(
class extends React.Component<IEditTransactionDialogProps, IEditTransactionDialogState> {

  constructor(props: IEditTransactionDialogProps, context?: any) {
    super(props, context);
    this.state = {
      tagsValue: props.transaction.tags.join(', '),
      notesValue: props.transaction.notes || '',
    };
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let transaction: ITransaction = this.props.transaction;
    return <Dialog
            open={true}
            onClose={this.props.onClose}
            scroll='paper'
            classes={{root: classes.dialogRoot, paper: classes.dialogPaper}}
            >
        <DialogTitle>{'Edit Transaction'}</DialogTitle>
        <DialogContent>
          <TransactionsTable>
            <Transaction
                transaction={transaction}
                hideDate
                hideTags
                classes={{
                    row: classes.transactionRow,
                    amount: classes.transactionAmount,
                }}
                />
          </TransactionsTable>
          <TextField
              placeholder='e.g. food, restaurant'
              label='Tags (comma separated)'
              className='textfield'
              defaultValue={this.state.tagsValue}
              style={{width: '100%'}}
              inputProps={{autoCapitalize: 'none'}}
              autoFocus={!this.state.tagsValue}
              onChange={(event) => this.setState({tagsValue: (event.target as HTMLInputElement).value})}
              onKeyPress={(e) => this.handleKeyPress(e)}
          /><br />
          <TextField
              label='Notes'
              className='textfield'
              defaultValue={this.state.notesValue}
              style={{width: '100%'}}
              autoFocus={!!this.state.tagsValue}
              onChange={(event) => this.setState({notesValue: (event.target as HTMLInputElement).value})}
              onKeyPress={(e) => { this.handleKeyPress(e); }}
          />
        </DialogContent>
        <DialogActions>
          <Button color='primary' onClick={this.props.onClose}>Cancel</Button>
          {/* TODO: Disable button unless there are changes. */}
          <Button color='primary' onClick={() => this.handleSave() }>Save</Button>
        </DialogActions>
      </Dialog>;
  }

  private handleKeyPress(e: React.KeyboardEvent<{}>): void {
    // charCode 13 is the Enter key.
    if (e.charCode == 13) {
      this.handleSave();
    }
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

    this.props.onSaveChanges(transaction);
    this.props.onClose();
  }
});

export default EditTransactionDialog;
