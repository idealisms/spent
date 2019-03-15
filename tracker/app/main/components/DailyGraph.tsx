import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import moment from 'moment';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import { GoogleDataTableCell } from 'react-google-charts/dist/types';
import { ITransaction, TransactionUtils } from '../../transactions';
import { ISpendTarget } from '../Model';

const styles = (theme: Theme) => createStyles({
  root: {
    flex: '0 1 400px',
    padding: '8px 16px',
    maxHeight: 'calc(50% - 64px)',
    '@media (max-width: 420px)': {
      paddingBottom: '0',
    },
    overflowX: 'auto',
  },
});
interface IDailyGraphProps extends WithStyles<typeof styles> {
  graph_id: string;
  transactions: ITransaction[];
  spendTarget?: ISpendTarget;
  onClickDate?: (date: Date) => void;
}
interface IDailyGraphState {
}
const DailyGraph = withStyles(styles)(
class extends React.Component<IDailyGraphProps, IDailyGraphState> {
  private container: HTMLElement|null = null;

  public componentDidMount(): void {
    if (!this.container) {
      console.log('container not set (componentDidMount)');
      return;
    }
    this.showEndOfGraph();
  }

  public componentDidUpdate(prevProps: IDailyGraphProps): void {
    if (prevProps.transactions !== this.props.transactions && this.container) {
      this.showEndOfGraph();
    }
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;

    // We want the y-axis on the right side only. To do this, we create a
    // fake data set for the left y-axis.
    let data: [Date, number|null, number][] = [];

    let min = 0;
    let max = 0;
    if (this.props.transactions.length && this.props.spendTarget) {
      let startDate = this.props.spendTarget.startDate;
      let endDate = this.props.spendTarget.endDate
          ? this.props.spendTarget.endDate : this.props.transactions[0].date;

      let dailyTotals: { [s: string]: number; } = {};
      for (let m = moment(startDate); m.isSameOrBefore(moment(endDate)); m = m.add(1, 'days')) {
        dailyTotals[m.format('YYYY-MM-DD')] = 0;
      }

      for (let transaction of this.props.transactions) {
        let spreadDuration = TransactionUtils.getSpreadDurationAsDays(transaction);
        if (spreadDuration !== undefined) {
          let spreadStartDate = moment(transaction.date);
          let spreadEndDate = moment.min(
              spreadStartDate.clone().add(spreadDuration - 1, 'days'),
              moment(endDate));
          for (let m = spreadStartDate; m.isSameOrBefore(spreadEndDate); m = m.add(1, 'days')) {
            dailyTotals[m.format('YYYY-MM-DD')] += transaction.amount_cents / spreadDuration;
          }
        } else {
          dailyTotals[transaction.date] += transaction.amount_cents;
        }
      }

      let currentTotal = this.props.spendTarget.startBalanceCents;
      let dailyBudgetCents = this.props.spendTarget.targetAnnualCents / 365;
      for (let m = moment(startDate); m.isSameOrBefore(moment(endDate)); m = m.add(1, 'days')) {
        let currentDate = m.format('YYYY-MM-DD');
        currentTotal += dailyTotals[currentDate] - dailyBudgetCents;
        data.push([m.toDate(), data.length ? null : 0, currentTotal / 100.0]);

        min = Math.min(min, currentTotal / 100.0);
        max = Math.max(max, currentTotal / 100.0);
      }
    } else {
      data.push([moment().toDate(), 0, 0]);
    }

    let chartWidth = data.length < 30 ? 'auto' : `${data.length * 10}px`;

    // Set the y axis range to be 5% padding above and below.
    let yHeight = max - min;
    max = max + .05 * yHeight;
    min = min - .05 * yHeight;

    return (
        <div className={classes.root} ref={(elt) => this.container = elt}>
          <div style={{width: chartWidth, height: '100%'}}>
            <Chart
                chartType='LineChart'
                columns={[
                  {label: 'Date', type: 'date'},
                  {label: '-', type: 'number'},
                  {label: 'Dollars', type: 'number'},
                ]}
                rows={data as GoogleDataTableCell[][]}
                options={{
                  chartArea: {
                    top: 16,
                    right: 80,
                    bottom: 32,
                    left: 16,
                  },
                  series: {
                    0: {targetAxisIndex: 0, visibleInLegend: false, pointSize: 0, lineWidth: 0},
                    1: {targetAxisIndex: 1},
                  },
                  colors: ['#3366cc', '#3366cc'],
                  hAxis: {
                    title: '',
                    textStyle: {
                      fontSize: 13,
                    },
                  },
                  vAxes: [
                    {
                      textPosition: 'none',
                      viewWindow: {
                        min,
                        max,
                      },
                    },
                    {
                      title: '',
                      format: '¤#,###',
                      textPosition: 'out',
                      textStyle: {
                        fontSize: 16,
                      },
                      viewWindow: {
                        min,
                        max,
                      },
                    },
                  ],
                  legend: {position: 'none'},
                }}
                graph_id={this.props.graph_id}
                width='auto'
                height='100%'
                chartEvents={this.props.onClickDate
                  ? [{
                      eventName: 'select',
                      callback: ({chartWrapper}) => {
                        let selected = chartWrapper.getChart().getSelection();
                        let row = selected[0].row as number;
                        this.props.onClickDate!(data[row][0]);
                      },
                    }]
                  : []}
              />
          </div>
        </div>);
  }

  private showEndOfGraph = () => {
    if (!this.container) {
      console.log('container not set (showEndOfGraph)');
      return;
    }
    this.container.scrollLeft = this.container.scrollWidth;
  }
});

export default DailyGraph;
