import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';

const styles = (theme: Theme) => createStyles({
  root: {
    borderTop: '1px solid lightgrey',
    lineHeight: '46px',
  },
});
interface ITransactionsTableProps extends WithStyles<typeof styles> {
}
const TransactionsTable = withStyles(styles)(
class extends React.Component<ITransactionsTableProps, object> {

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    return <div className={classes.root}>{this.props.children}</div>;
  }
});

export default TransactionsTable;
