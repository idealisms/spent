import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import * as TransactionUtils from '../../transactions/utils';
import { IChartNode } from '../Model';

const styles = (theme: Theme) => createStyles({
  root: {
    height: '100% !important',
  },
});

interface IReportChartProps extends WithStyles<typeof styles> {
  chartData: IChartNode[];
}
interface IReportChartState {
}
const ReportChart = withStyles(styles)(
class extends React.Component<IReportChartProps, IReportChartState> {
  constructor(props: IReportChartProps, context?: any) {
    super(props, context);
    this.state = {
    };
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;

    let data = [];
    data.push(['Category', 'Amount', { role: 'annotation', type: 'string' }]);
    for (let chartNode of this.props.chartData) {
      if (chartNode.amount_cents <= 0) {
        continue;
      }
      data.push([
        chartNode.title,
        chartNode.amount_cents / 100.0,
        TransactionUtils.formatAmountNumber(chartNode.amount_cents),
      ]);
    }

    let loadingPlaceholder = <div style={{height: '60%', padding: '16px'}}>Loading . . .</div>;

    if (data.length == 1) {
      return loadingPlaceholder;
    }

    return (
        <Chart
            className={classes.root}
            style={{height: '60%'}}
            chartType='BarChart'
            loader={loadingPlaceholder}
            data={data}
            options={{
              bars: 'horizontal',
              bar: { groupWidth: '90%' },
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
