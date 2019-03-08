import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import * as React from 'react';
import { ITransaction } from '../Model';
import { formatAmountNumber } from '../utils';
import { styles } from './Transaction';

const headerStyles = (theme: Theme) => {
  let mergedStyles = styles(theme);
  mergedStyles.row.color = '#757575';
  mergedStyles.date.visibility = 'hidden';
  mergedStyles.category.marginTop = '4px';
  mergedStyles.category.color = '#757575';
  return createStyles(mergedStyles);
};

interface ITransactionsTableSumRowProps extends WithStyles<typeof headerStyles> {
  transactions: ITransaction[];
  selectAllChecked?: boolean;
  onSelectAllClick?: (selectAll: boolean) => void;
}
interface ITransactionsTableSumRowState {
}
const TransactionTableHeader = withStyles(headerStyles)(
class extends React.Component<ITransactionsTableSumRowProps, ITransactionsTableSumRowState> {
  constructor(props: ITransactionsTableSumRowProps, context?: any) {
    super(props, context);
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;

    let totalAmount = this.props.transactions.reduce(
        (total, transaction) => total + transaction.amount_cents, 0);
    let isCredit = totalAmount < 0;
    let description = this.props.transactions.length == 1
        ? '1 transaction'
        : `${this.props.transactions.length} transactions`;
    return (
      <div
          className={classes.row}>
        <div className={classes.date}><span className='y'>2000-</span>01-01</div>
        <div className={classes.amount + (isCredit ? ' credit' : '')}>{formatAmountNumber(totalAmount)}</div>
        {this.props.onSelectAllClick
          ? <div
                className={classes.category + ' editable'}
                title='Select All'
                onClick={this.handleSelectAllClick}>
              {this.props.selectAllChecked ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
            </div>
          : <div className={classes.category}></div>}
        <div className={classes.description}>{description}</div>
    </div>);
  }

  private handleSelectAllClick = (): void => {
    if (this.props.onSelectAllClick) {
      this.props.onSelectAllClick(!this.props.selectAllChecked);
    }
  }
});

export default TransactionTableHeader;