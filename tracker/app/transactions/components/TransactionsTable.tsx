import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';

const ROW_HEIGHT = 48;

const styles = (_theme: Theme) =>
  createStyles({
    root: {
      // The border rendered on the bottom of each row takes 1px.
      lineHeight: `${ROW_HEIGHT - 1}px`,
      // This allows overflow: auto to work on iOS.
      WebkitOverflowScrolling: 'touch',
    },
  });
interface ITransactionsTableProps extends WithStyles<typeof styles> {
  /** This only works if the height can be computed without rendering the
   *  rows (e.g., a fixed height or flex child).
   */
  lazyRender?: boolean;
  /** The index to scroll into view. */
  scrollToRow?: number;
  /** If true, hides the component. */
  hidden?: boolean;
  children?: React.ReactNode;
}
interface ITransactionsTableState {
  containerHeight: number;
  scrollTop: number;
}
const TransactionsTable = withStyles(styles)(
  class Component extends React.Component<
    ITransactionsTableProps,
    ITransactionsTableState
  > {
    private containerRef: React.RefObject<HTMLDivElement>;
    private resizeObserver: ResizeObserver;

    constructor(props: ITransactionsTableProps) {
      super(props);
      this.state = {
        containerHeight: -1,
        scrollTop: -1,
      };
      this.containerRef = React.createRef<HTMLDivElement>();
      this.resizeObserver = new ResizeObserver(this.resizeObserved);
    }

    public componentDidMount(): void {
      if (!this.containerRef.current) {
        console.log('container not set (componentDidMount)');
        return;
      }
      this.setState({
        containerHeight: this.containerRef.current.offsetHeight,
        scrollTop: this.containerRef.current.scrollTop,
      });
      this.resizeObserver.observe(this.containerRef.current);
    }

    public componentWillUnmount(): void {
      this.resizeObserver.disconnect();
    }

    public componentDidUpdate(prevProps: ITransactionsTableProps): void {
      if (this.props.scrollToRow !== prevProps.scrollToRow) {
        if (this.props.scrollToRow !== undefined && this.containerRef.current) {
          let scrollTop = this.props.scrollToRow * ROW_HEIGHT;
          // This will trigger the scroll event handler.
          this.containerRef.current.scrollTo(0, scrollTop);
        }
      }
    }

    public render(): React.ReactElement<Record<string, unknown>> {
      let classes = this.props.classes;
      let shouldRenderChildren =
        !this.props.lazyRender || this.state.containerHeight != -1;

      return (
        <div
          className={classes.root}
          hidden={this.props.hidden}
          ref={this.containerRef}
          onScroll={this.handleScroll}
        >
          {shouldRenderChildren && this.renderChildren()}
        </div>
      );
    }

    private resizeObserved: ResizeObserverCallback = entries => {
      for (let entry of entries) {
        this.setState({
          containerHeight: entry.contentRect.height,
          scrollTop: entry.target.scrollTop,
        });
      }
    };

    private handleScroll = (_event: React.UIEvent<HTMLDivElement>) => {
      if (!this.containerRef.current) {
        console.log('container not set (handleScroll)');
        return;
      }
      this.setState({
        scrollTop: this.containerRef.current.scrollTop,
      });
    };

    private renderChildren = (): React.ReactElement => {
      if (!this.props.lazyRender) {
        return <React.Fragment>{this.props.children}</React.Fragment>;
      }
      if (!this.containerRef.current) {
        console.log('container not set (renderChildren)');
        return <div></div>;
      }

      let numRows = React.Children.count(this.props.children);

      // Make sure we haven't scrolled past the bottom of the table.
      let maxScrollTop = Math.max(
        0,
        ROW_HEIGHT * numRows - this.state.containerHeight
      );
      if (this.state.scrollTop > maxScrollTop) {
        this.containerRef.current.scrollTop = maxScrollTop;
      }

      let rowsBefore = Math.floor(this.state.scrollTop / ROW_HEIGHT);
      let rowsToShow = Math.min(
        numRows,
        Math.ceil(this.state.containerHeight / ROW_HEIGHT) + 2
      );
      let rowsAfter = Math.max(0, numRows - rowsBefore - rowsToShow);

      return (
        <React.Fragment>
          <div style={{ height: `${rowsBefore * ROW_HEIGHT}px` }}></div>
          {React.Children.toArray(this.props.children).slice(
            rowsBefore,
            rowsBefore + rowsToShow
          )}
          <div style={{ height: `${rowsAfter * ROW_HEIGHT}px` }}></div>
        </React.Fragment>
      );
    };
  }
);

export default TransactionsTable;
