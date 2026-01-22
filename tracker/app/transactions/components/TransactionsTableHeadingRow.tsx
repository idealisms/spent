import {
  createStyles,
  Theme,
  withStyles,
  WithStyles,
} from '@material-ui/core/styles';
import { CSSProperties } from '@material-ui/core/styles/withStyles';
import * as React from 'react';
import { styles } from './Transaction';

const rowStyles = (theme: Theme) => {
  let mergedStyles = styles(theme);
  let row = mergedStyles.row as CSSProperties;
  row.padding = '0 16px';
  row.color = theme.palette.text.primary;
  return createStyles(mergedStyles);
};

interface ITransactionsTableSumRowProps extends WithStyles<typeof rowStyles> {
  children?: React.ReactNode;
}
interface ITransactionsTableSumRowState {}
const TransactionsTableHeadingRow = withStyles(rowStyles)(
  class Component extends React.Component<
    ITransactionsTableSumRowProps,
    ITransactionsTableSumRowState
  > {
    public render(): React.ReactElement<Record<string, unknown>> {
      let classes = this.props.classes;

      return <div className={classes.row}>{this.props.children}</div>;
    }
  }
);

export default TransactionsTableHeadingRow;
