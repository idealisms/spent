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
import TagSelect from './TagSelect';
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
      width: '100%',
    },
  },
  dialogPaper: {
    width: 'calc(100% - 64px)',
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
  tags: string[];
  notesValue: string;
}
const EditTransactionDialog = withStyles(styles)(
    class extends React.Component<IEditTransactionDialogProps, IEditTransactionDialogState> {

      constructor(props: IEditTransactionDialogProps, context?: any) {
        super(props, context);
        this.state = {
          tags: [...this.props.transaction.tags],
          notesValue: props.transaction.notes || '',
        };
      }

      public render(): React.ReactElement<object> {
        let classes = this.props.classes;
        let transaction: ITransaction = this.props.transaction;
        return <Dialog
          open
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
            <TagSelect
              onChange={this.handleChangeTagSelect}
              value={this.state.tags}
              allowNewTags
              className='textfield'
              autoFocus={!this.state.tags.length}
              placeholder='e.g. food, restaurant'
            /><br />

            <TextField
              label='Notes'
              className='textfield'
              defaultValue={this.state.notesValue}
              autoFocus={this.state.tags.length != 0}
              onChange={(event) => this.setState({notesValue: (event.target as HTMLInputElement).value})}
              onKeyPress={this.handleKeyPress}
            />
          </DialogContent>
          <DialogActions>
            <Button color='primary' onClick={this.props.onClose}>Cancel</Button>
            {/* TODO: Disable button unless there are changes. */}
            <Button color='primary' onClick={this.handleSave}>Save</Button>
          </DialogActions>
        </Dialog>;
      }

      private handleChangeTagSelect = (tags: string[]): void => {
        this.setState({
          tags,
        });
      };

      private handleKeyPress = (e: React.KeyboardEvent<{}>): void => {
        // charCode 13 is the Enter key.
        if (e.charCode == 13) {
          this.handleSave();
        }
      };

      private handleSave = (): void => {
        let tags = new Array(...this.state.tags);

        this.props.onSaveChanges({
          ...this.props.transaction,
          tags,
          notes: this.state.notesValue.trim(),
        });
        this.props.onClose();
      };
    });

export default EditTransactionDialog;
