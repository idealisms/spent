import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { styles } from './Transaction';

const rowStyles = (theme: Theme) => {
  let mergedStyles = styles(theme);
  mergedStyles.row.padding = '0 16px';
  mergedStyles.row.color = theme.palette.text.primary;
  return createStyles(mergedStyles);
};

interface ITransactionsTableSumRowProps extends WithStyles<typeof rowStyles> {
}
interface ITransactionsTableSumRowState {
}
const TransactionsTableHeadingRow = withStyles(rowStyles)(
class extends React.Component<ITransactionsTableSumRowProps, ITransactionsTableSumRowState> {

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;

    return (
      <div className={classes.row}>
        {this.props.children}
      </div>);
  }
});

export default TransactionsTableHeadingRow;
