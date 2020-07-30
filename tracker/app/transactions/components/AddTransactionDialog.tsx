import { createStyles, WithStyles } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { Theme, withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { KeyboardDatePicker } from '@material-ui/pickers';
import { MaterialUiPickersDate } from '@material-ui/pickers/typings/date';
import moment from 'moment';
import * as React from 'react';
import { ITransaction } from '../Model';
import { generateUUID } from '../utils';
import TagSelect from './TagSelect';


const styles = (_theme: Theme) => createStyles({
  dialogRoot: {
    '@media (max-height: 380px)': {
      marginTop: '-40px',
      marginBottom: '-40px',
    },
  },
  dialogPaper: {
    width: 'calc(100% - 64px)',
  },
  flexRow: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    margin: '0 -8px',
    '& > *': {
      margin: '0 8px 16px',
    },
  },
  datepicker: {
    flex: '1 0 140px',
    maxWidth: '164px',
  },
  tagselect: {
    flex: '3 0 200px',
  },
  description: {
    flex: '1 1 200px',
  },
  notes: {
    flex: '1 1 200px',
  },
  amountFlexItem: {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'baseline',
    maxWidth: '90px',
  },
  amount: {
    flex: '0 0 80px',
    '& input': {
      textAlign: 'right',
    },
  },
});

interface IAddTransactionDialogProps extends WithStyles<typeof styles> {
  onClose: () => void;
  onSaveChanges: (transaction: ITransaction) => void;
}
interface IAddTransactionDialogState {
  date: Date;
  amount: string;
  amountCents: number;
  description: string;
  tags: string[];
  notes: string;
}
const AddTransactionDialog = withStyles(styles)(
    class Component extends React.Component<IAddTransactionDialogProps, IAddTransactionDialogState> {

      constructor(props: IAddTransactionDialogProps, context?: any) {
        super(props, context);
        this.state = {
          date: moment().startOf('day').toDate(),
          amount: '',
          amountCents: 0,
          description: '',
          tags: [],
          notes: '',
        };
      }

      public render(): React.ReactElement<Record<string, unknown>> {
        let classes = this.props.classes;
        return <Dialog
          open
          onClose={this.props.onClose}
          scroll='paper'
          classes={{root: classes.dialogRoot, paper: classes.dialogPaper}}
        >
          <DialogTitle>{'Add Transaction'}</DialogTitle>
          <DialogContent>
            <div className={classes.flexRow}>
              <KeyboardDatePicker
                className={classes.datepicker}
                label='Date'
                value={this.state.date}
                maxDate={moment().startOf('day').toDate()}
                onChange={(d: MaterialUiPickersDate) => d ? this.setState({date: d.toDate()}) : null}
                format='YYYY-MM-DD'
                // mask={[/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
              />

              <div className={classes.amountFlexItem}>
                <div>$</div>
                <TextField
                  className={classes.amount}
                  placeholder='1.00'
                  value={this.state.amount}
                  autoFocus
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => this.setState({amount: event.target.value})}
                  onBlur={(event) => this.handleBlurAmount(event.target as HTMLInputElement)}
                />
              </div>

              <TextField
                className={classes.description}
                label='Description'
                defaultValue={this.state.description}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => this.setState({description: event.target.value})}
                onKeyPress={this.handleKeyPress}
              />
              <TagSelect
                className={classes.tagselect}
                onChange={this.handleChangeTagSelect}
                value={this.state.tags}
                allowNewTags
                placeholder='e.g. food, restaurant'
              />
              <TextField
                className={classes.notes}
                label='Notes'
                defaultValue={this.state.notes}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => this.setState({notes: event.target.value})}
                onKeyPress={this.handleKeyPress}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button color='primary' onClick={this.props.onClose}>Cancel</Button>
            <Button color='primary' disabled={this.saveDisabled()} onClick={this.handleSave}>Save</Button>
          </DialogActions>
        </Dialog>;
      }

      private saveDisabled = () => {
        return this.state.amountCents == 0 || !this.state.description.trim();
      };

      private handleBlurAmount = (input: HTMLInputElement) => {
        let inputValue = input.value.trim();
        let amount = inputValue.length > 0 ? Number(input.value.trim()) : NaN;
        if (!isNaN(amount)) {
          let amountCents = Math.trunc(amount * 100);
          this.setState({
            amountCents,
            amount: (amountCents / 100.0).toFixed(2),
          });
        } else {
          this.setState({
            amountCents: 0,
            amount: '',
          });
        }
      };

      private handleChangeTagSelect = (tags: string[]): void => {
        this.setState({
          tags,
        });
      };

      private handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>): void => {
        // charCode 13 is the Enter key.
        if (e.charCode == 13 && !this.saveDisabled()) {
          this.handleSave();
        }
      };

      private handleSave = (): void => {
        let transaction: ITransaction = {
          id: generateUUID(),
          description: this.state.description,
          amount_cents: this.state.amountCents,
          date: moment(this.state.date).format('YYYY-MM-DD'),
          tags: new Array(...this.state.tags),
          notes: this.state.notes.trim(),
          original_line: `Manually added  @ ${moment().toString()}`,
          transactions: [],
        };

        this.props.onSaveChanges(transaction);
        this.props.onClose();
      };
    });

export default AddTransactionDialog;
