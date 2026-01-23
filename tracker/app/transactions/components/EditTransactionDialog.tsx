import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { ITransaction } from '../model';
import TagSelect from './TagSelect';
import Transaction from './Transaction';
import TransactionsTable from './TransactionsTable';

const useStyles = makeStyles()((_theme: Theme) => ({
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
}));

interface IEditTransactionDialogProps {
  transaction: ITransaction;
  onClose: () => void;
  onSaveChanges: (transaction: ITransaction) => void;
}
interface IEditTransactionDialogState {
  tags: string[];
  notesValue: string;
}

interface IEditTransactionDialogInnerProps extends IEditTransactionDialogProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class EditTransactionDialogInner extends React.Component<
  IEditTransactionDialogInnerProps,
  IEditTransactionDialogState
> {
  constructor(props: IEditTransactionDialogInnerProps) {
    super(props);
    this.state = {
      tags: [...this.props.transaction.tags],
      notesValue: props.transaction.notes || '',
    };
  }

  public render(): React.ReactElement<Record<string, unknown>> {
    let classes = this.props.classes;
    let transaction: ITransaction = this.props.transaction;
    return (
      <Dialog
        open
        onClose={this.props.onClose}
        scroll="paper"
        classes={{ root: classes.dialogRoot, paper: classes.dialogPaper }}
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
            className="textfield"
            autoFocus={!this.state.tags.length}
            placeholder="e.g. food, restaurant"
          />
          <br />

          <TextField
            label="Notes"
            className="textfield"
            defaultValue={this.state.notesValue}
            autoFocus={this.state.tags.length != 0}
            onChange={event =>
              this.setState({
                notesValue: (event.target as HTMLInputElement).value,
              })
            }
            onKeyPress={this.handleKeyPress}
          />
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={this.props.onClose}>
            Cancel
          </Button>
          {/* TODO: Disable button unless there are changes. */}
          <Button color="primary" onClick={this.handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private handleChangeTagSelect = (tags: string[]): void => {
    this.setState({
      tags,
    });
  };

  private handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>): void => {
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
}

function EditTransactionDialogWrapper(props: IEditTransactionDialogProps) {
  const { classes } = useStyles();
  return <EditTransactionDialogInner {...props} classes={classes} />;
}

export default EditTransactionDialogWrapper;
