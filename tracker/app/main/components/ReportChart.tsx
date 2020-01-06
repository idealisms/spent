import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { Chart } from 'react-google-charts';

const styles = (theme: Theme) => createStyles({
  root: {
    height: '100% !important',
  },
});

interface IReportChartProps extends WithStyles<typeof styles> {
  chartData: Array<any>[];
}
interface IReportChartState {
}
const ReportChart = withStyles(styles)(
class extends React.Component<IReportChartProps, IReportChartState> {
  constructor(props: IReportChartProps, context?: any) {
    super(props, context);
    this.state = {};
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;

    let loadingPlaceholder = <div style={{height: '60%', padding: '16px'}}>Loading . . .</div>;

    if (this.props.chartData.length <= 1) {
      return loadingPlaceholder;
    }

    return (
        <Chart
            className={classes.root}
            style={{height: '90%'}}
            chartType='BarChart'
            loader={loadingPlaceholder}
            data={this.props.chartData}
            options={{
              bars: 'horizontal',
              legend: { position: 'none' },
              chartArea: { left: 'auto', top: 16, right: 48, bottom: 48 },
              hAxis: {
                format: 'currency',
                title: 'Amount',
                minValue: 0,
              },
            }}
        />);
  }
});

export default ReportChart;
