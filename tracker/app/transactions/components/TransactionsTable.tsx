import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';

const ROW_HEIGHT = 48;

const styles = (theme: Theme) => createStyles({
  root: {
    // The border rendered on the bottom of each row takes 1px.
    lineHeight: `${ROW_HEIGHT - 1}px`,
  },
});
interface ITransactionsTableProps extends WithStyles<typeof styles> {
  /** This only works if the height can be computed without rendering the
   *  rows (e.g., a fixed height or flex child).
   */
  lazyRender?: boolean;
}
interface ITransactionsTableState {
  containerHeight: number;
  scrollTop: number;
}
const TransactionsTable = withStyles(styles)(
class extends React.Component<ITransactionsTableProps, ITransactionsTableState> {
  private container: HTMLElement|null = null;

  constructor(props: ITransactionsTableProps, context?: any) {
    super(props, context);
    this.state = {
      containerHeight: -1,
      scrollTop: -1,
    };
  }

  public componentDidMount(): void {
    if (!this.container) {
      console.log('container not set (componentDidMount)');
      return;
    }
    this.setState({
      containerHeight: this.container.offsetHeight,
      scrollTop: this.container.scrollTop,
    });
    window.addEventListener('resize', this.handleWindowResize);
  }

  public componentWillUnmount(): void {
    window.removeEventListener('resize', this.handleWindowResize);
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let shouldRenderChildren = !this.props.lazyRender || this.state.containerHeight != -1;

    return (
        <div
            className={classes.root}
            ref={(elt) => this.container = elt}
            onScroll={this.handleScroll}>
          {shouldRenderChildren && this.renderChildren()}
        </div>);
  }

  private handleWindowResize = () => {
    if (!this.container) {
      console.log('container not set (handleWindowResize)');
      return;
    }
    this.setState({
      containerHeight: this.container.offsetHeight,
      scrollTop: this.container.scrollTop,
    });
  }

  private handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!this.container) {
      console.log('container not set (handleScroll)');
      return;
    }
    this.setState({
      scrollTop: this.container.scrollTop,
    });
  }

  private renderChildren = (): React.ReactElement => {
    if (!this.props.lazyRender) {
      return <React.Fragment>{this.props.children}</React.Fragment>;
    }

    let numRows = React.Children.count(this.props.children);
    let rowsBefore = Math.floor(this.state.scrollTop / ROW_HEIGHT);
    let rowsToShow = Math.min(numRows, Math.ceil(this.state.containerHeight / ROW_HEIGHT) + 2);
    let rowsAfter = Math.max(0, numRows - rowsBefore - rowsToShow);

    return (
        <React.Fragment>
          <div style={{height: `${rowsBefore * ROW_HEIGHT}px`}}></div>
          {React.Children.toArray(this.props.children).slice(rowsBefore, rowsBefore + rowsToShow)}
          <div style={{height: `${rowsAfter * ROW_HEIGHT}px`}}></div>
        </React.Fragment>);
  }
});

export default TransactionsTable;
