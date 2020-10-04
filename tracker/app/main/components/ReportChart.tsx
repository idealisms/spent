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
    class Component extends React.Component<
    IReportChartProps,
    IReportChartState
    > {
      constructor(props: IReportChartProps) {
        super(props);
        this.state = {};
      }

      public render(): React.ReactElement<Record<string, unknown>> {
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

        return (
          <div className={classes.chartContainer}>
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
    }
);

export default ReportChart;
