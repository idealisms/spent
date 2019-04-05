import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import moment from 'moment';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import { GoogleDataTableCell, GoogleDataTableColumnRoleType } from 'react-google-charts/dist/types';
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
    '& .google-visualization-tooltip': {
      paddingLeft: '4px',
      fontSize: '16px',
    },
    '& .google-visualization-tooltip table': {
      fontSize: '10px',
      borderCollapse: 'collapse',
    },
    '& .google-visualization-tooltip table tr:nth-child(odd)': {
      backgroundColor: '#ddd',
    },
    '& .google-visualization-tooltip table td:first-child': {
      textAlign: 'right',
    },
    '& .google-visualization-tooltip .notes': {
      color: 'rgba(0, 0, 0, .54)',
    },
  },
});
type PerDayTransactions = {
  amountCents: number,
  description: string,
  notes?: string,
}[];

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

  public shouldComponentUpdate(nextProps: IDailyGraphProps, nextState: IDailyGraphState): boolean {
    // Prevent a re-render when props haven't changed. This was happening when
    // the onClickDate callback was called, which triggered a re-render of
    // DailyGraph.
    return !(this.props.graph_id == nextProps.graph_id &&
        this.props.transactions === nextProps.transactions &&
        this.props.spendTarget === nextProps.spendTarget &&
        this.props.onClickDate === nextProps.onClickDate);
  }

  public componentDidUpdate(prevProps: IDailyGraphProps): void {
    if (prevProps.transactions !== this.props.transactions && this.container) {
      this.showEndOfGraph();
    }
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;

    // console.time('graph');
    let dataMapByDate = this.buildDataMap();
    // console.timeLog('graph', 'built');
    let dataAsRows: [Date, number|null, number, string][] = this.formatDataAsRows(dataMapByDate);
    // console.timeEnd('graph');

    // We place the chart in a div with horizontal overflow so we can scroll
    // to see more data. This also avoids re-renderings of data due to window
    // size changes.
    let chartWidth = dataAsRows.length < 30 ? 'auto' : `${dataAsRows.length * 10}px`;

    // Set the y axis range to be 5% padding above and below the data range.
    let min = 0;
    let max = 0;
    for (let row of dataAsRows) {
      min = Math.min(min, row[2]);
      max = Math.max(max, row[2]);
    }
    let yHeight = max - min;
    max = max + .05 * yHeight;
    min = min - .05 * yHeight;

    return (
        <div className={classes.root} ref={(elt) => this.container = elt}>
          <div style={{width: chartWidth, height: '100%'}}>
            <Chart
                chartType='LineChart'
                columns={[
                  {type: 'date', label: 'Date'},
                  {type: 'number', label: '-'},
                  {type: 'number', label: 'Dollars'},
                  {type: 'string', role: 'tooltip' as GoogleDataTableColumnRoleType, p: {html: true}},
                ]}
                rows={dataAsRows as GoogleDataTableCell[][]}
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
                  tooltip: {isHtml: true},
                }}
                graph_id={this.props.graph_id}
                width='auto'
                height='100%'
                chartEvents={this.props.onClickDate
                  ? [{
                      eventName: 'select',
                      callback: ({chartWrapper}) => {
                        let selected = chartWrapper.getChart().getSelection();
                        // This event also fires when de-selecting a point,
                        // in which case, selected is an empty array.
                        if (selected.length > 0) {
                          let row = selected[0].row as number;
                          this.props.onClickDate!(dataAsRows[row][0]);
                        }
                      },
                    }]
                  : []}
              />
          </div>
        </div>);
  }

  private buildDataMap = () => {
    let dataMapByDate: { [s: string]: PerDayTransactions; } = {};

    if (!this.props.transactions.length || !this.props.spendTarget) {
      return dataMapByDate;
    }

    let startDate = this.props.spendTarget.startDate;
    let endDate = this.props.spendTarget.endDate
        ? this.props.spendTarget.endDate : this.props.transactions[0].date;

    let dailyBudgetCents = this.props.spendTarget!.targetAnnualCents / 365;
    for (let m = moment(startDate); m.isSameOrBefore(moment(endDate)); m = m.add(1, 'days')) {
      dataMapByDate[m.format('YYYY-MM-DD')] = [{
        amountCents: -dailyBudgetCents,
        description: 'daily budget',
      }];
    }

    for (let transaction of this.props.transactions) {
      let spreadDuration = TransactionUtils.getSpreadDurationAsDays(transaction);
      if (spreadDuration !== undefined) {
        let spreadStartDate = moment(transaction.date);
        let spreadEndDate = moment.min(
            spreadStartDate.clone().add(spreadDuration - 1, 'days'),
            moment(endDate));
        for (let m = spreadStartDate; m.isSameOrBefore(spreadEndDate); m = m.add(1, 'days')) {
          dataMapByDate[m.format('YYYY-MM-DD')].push({
            amountCents: transaction.amount_cents / spreadDuration,
            description: transaction.description,
            notes: transaction.notes,
          });
        }
      } else {
        dataMapByDate[transaction.date].push({
          amountCents: transaction.amount_cents,
          description: transaction.description,
          notes: transaction.notes,
        });
      }
    }
    return dataMapByDate;
  }

  private formatDataAsRows = (dataMapByDate: { [s: string]: PerDayTransactions; }): [Date, number|null, number, string][] => {
    let dates = Object.keys(dataMapByDate).sort();
    if (dates.length == 0) {
      return [[moment().toDate(), 0, 0, '']];
    }

    // We want the y-axis on the right side only. To do this, we create a
    // fake data set for the left y-axis.
    let dataAsRows: [Date, number|null, number, string][] = [];
    let currentTotal = this.props.spendTarget!.startBalanceCents;
    for (let m = moment(dates[0]); m.isSameOrBefore(moment(dates[dates.length - 1])); m = m.add(1, 'days')) {
      let currentDate = m.format('YYYY-MM-DD');
      let toolTipHtml = '<table>';
      for (let transaction of dataMapByDate[currentDate]) {
        currentTotal += transaction.amountCents;
        let amount = TransactionUtils.formatAmountNumber(transaction.amountCents);
        let notes = transaction.notes ? ` - <span class='notes'>${transaction.notes}</span>` : '';
        toolTipHtml += `<tr><td>${amount}</td><td>${transaction.description} ${notes}</td></tr>`;
      }
      toolTipHtml += '</table>';

      toolTipHtml = `<div><strong>${
        TransactionUtils.formatAmountNumber(currentTotal)}</strong> on <strong>${
        m.format('MMM D, YYYY')}</strong></div>${toolTipHtml}`;

      dataAsRows.push([
          m.toDate(),
          dataAsRows.length ? null : 0,
          Math.round(currentTotal) / 100,
          toolTipHtml,
      ]);
    }
    return dataAsRows;
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
