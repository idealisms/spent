import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { Chart } from 'react-google-charts';

const styles = (_theme: Theme) =>
  createStyles({
    chartContainer: {
      width: '100%',
      height: '50%',
      overflow: 'auto hidden',
    },
  });

interface IReportChartProps extends WithStyles<typeof styles> {
  chartData: Array<any>[];
}
interface IReportChartState {}
const ReportChart = withStyles(styles)(
    class Component extends React.PureComponent<
    IReportChartProps,
    IReportChartState
    > {
      private containerRef: React.RefObject<HTMLDivElement>;
      private resizeObserver: ResizeObserver;
      private timerId?: NodeJS.Timeout;

      constructor(props: IReportChartProps) {
        super(props);
        this.state = {};
        this.containerRef = React.createRef<HTMLDivElement>();
        this.resizeObserver = new ResizeObserver(this.resizeObserved);
      }

      public componentDidMount(): void {
        if (!this.containerRef.current) {
          console.log('container not set (componentDidMount)');
          return;
        }
        this.resizeObserver.observe(this.containerRef.current);
      }

      public componentWillUnmount(): void {
        this.resizeObserver.disconnect();
      }

      public render(): React.ReactElement<Record<string, unknown>> {
        let startTime = window.performance.now();
        let classes = this.props.classes;

        let loadingPlaceholder = (
          <div style={{ height: '60%', padding: '16px' }}>Loading . . .</div>
        );

        if (this.props.chartData.length <= 1) {
          return loadingPlaceholder;
        }
        // Provide enough width for each category (48px). If the screen isn't
        // wide enough, the chart will scroll to the right.
        let minWidth = `${80 + 16 + 48 * (this.props.chartData.length - 1)}px`;

        console.debug(
            `${window.performance.now() - startTime} ReportChart render()`
        );
        return (
          <div className={classes.chartContainer} ref={this.containerRef}>
            <Chart
              style={{ height: '100%', minWidth: minWidth }}
              chartType="ColumnChart"
              loader={loadingPlaceholder}
              data={this.props.chartData}
              options={{
                bars: 'vertical',
                legend: { position: 'in', alignment: 'end' },
                chartArea: { left: 64, top: 16, right: 16, bottom: 96 },
                vAxis: {
                // format: 'currency',
                  format: '¤###,###,###',
                  minValue: 0,
                },
              }}
            />
          </div>
        );
      }

      private resizeObserved: ResizeObserverCallback = () => {
        // Force this component to update when the container div changes
        // size. This is needed because the SVG based chart needs to
        // recompute sizes. We wrap the call in a timeout so when the
        // drawer is opened or closed, we only resize after the animation
        // finishes.
        if (this.timerId != undefined) {
          clearInterval(this.timerId);
        }
        let transitionTimeMs = 225;
        this.timerId = setTimeout(() => this.forceUpdate(), transitionTimeMs);
      };
    }
);

export default ReportChart;
