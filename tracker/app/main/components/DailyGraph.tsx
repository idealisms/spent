import { createStyles, WithStyles } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { Theme, withStyles } from '@material-ui/core/styles';
import moment from 'moment';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import {
  GoogleDataTableCell,
  GoogleDataTableColumnRoleType,
} from 'react-google-charts/dist/types';
import { ITransaction, TransactionUtils } from '../../transactions';
import { IDailySpendTarget } from '../model';

const styles = (_theme: Theme) =>
  createStyles({
    root: {
      position: 'relative',
      flex: '0 1 400px',
      maxHeight: 'calc(50% - 64px)',
      '@media (max-width: 420px)': {
        paddingBottom: '0',
      },
    },
    controls: {
      position: 'absolute',
      top: '8px',
      left: '16px',
      zIndex: 1,
      padding: '0 8px',
      backgroundColor: 'rgba(232, 232, 232, .72)',
      borderRadius: '4px',
    },
    chartContainer: {
      height: 'calc(100% - 16px)',
      padding: '8px 16px',
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
  amountCents: number;
  description: string;
  notes?: string;
  daysLeft?: string;
}[];

interface IDailyGraphProps extends WithStyles<typeof styles> {
  graph_id: string;
  transactions: ITransaction[];
  spendTarget: IDailySpendTarget;
  onClickDate: (date: Date) => void;
}
interface IDailyGraphState {
  useSpread: boolean;
  shouldAnimate: boolean;
}
const DailyGraph = withStyles(styles)(
    class Component extends React.Component<IDailyGraphProps, IDailyGraphState> {
      private container: HTMLElement | null = null;

      constructor(props: IDailyGraphProps) {
        super(props);
        this.state = {
          useSpread: true,
          shouldAnimate: false,
        };
      }

      public componentDidMount(): void {
        if (!this.container) {
          console.log('container not set (componentDidMount)');
          return;
        }
        this.showEndOfGraph();
      }

      public shouldComponentUpdate(
          nextProps: IDailyGraphProps,
          nextState: IDailyGraphState
      ): boolean {
      // Prevent a re-render when props haven't changed. This was happening when
      // the onClickDate callback was called, which triggered a re-render of
      // DailyGraph.
        return !(
          this.props.graph_id == nextProps.graph_id &&
        this.props.transactions === nextProps.transactions &&
        this.props.spendTarget === nextProps.spendTarget &&
        this.props.onClickDate === nextProps.onClickDate &&
        this.state.useSpread === nextState.useSpread
        );
      }

      public componentDidUpdate(prevProps: IDailyGraphProps): void {
        if (
          prevProps.transactions !== this.props.transactions &&
        this.container
        ) {
          this.showEndOfGraph();
        }
      }

      public render(): React.ReactElement<Record<string, unknown>> {
        let classes = this.props.classes;

        // console.time('graph');
        let dataMapByDate = this.buildDataMap();
        // console.timeLog('graph', 'built');
        let dataAsRows: [
          Date,
          number | null,
          number,
          string
        ][] = this.formatDataAsRows(dataMapByDate);
        // console.timeEnd('graph');

        // We place the chart in a div with horizontal overflow so we can scroll
        // to see more data. This also avoids re-renderings of data due to window
        // size changes.
        let chartWidth =
        dataAsRows.length < 30 ? 'auto' : `${dataAsRows.length * 10}px`;

        // Set the y axis range to be 5% padding above and below the data range.
        let min = 0;
        let max = 0;
        for (let row of dataAsRows) {
          min = Math.min(min, row[2]);
          max = Math.max(max, row[2]);
        }
        let yHeight = max - min;
        max = max + 0.05 * yHeight;
        min = min - 0.05 * yHeight;

        return (
          <div className={classes.root}>
            <div className={classes.controls}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={this.state.useSpread}
                    onChange={() => {
                      this.setState({
                        useSpread: !this.state.useSpread,
                        shouldAnimate: true,
                      });
                    }}
                    color="primary"
                  />
                }
                label="spread"
              />
            </div>
            <div
              className={classes.chartContainer}
              ref={elt => (this.container = elt)}
            >
              <div style={{ width: chartWidth, height: '100%' }}>
                <Chart
                  chartType="LineChart"
                  columns={[
                    { type: 'date', label: 'Date' },
                    { type: 'number', label: '-' },
                    { type: 'number', label: 'Dollars' },
                    {
                      type: 'string',
                      role: 'tooltip' as GoogleDataTableColumnRoleType,
                      p: { html: true },
                    },
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
                      0: {
                        targetAxisIndex: 0,
                        visibleInLegend: false,
                        pointSize: 0,
                        lineWidth: 0,
                      },
                      1: { targetAxisIndex: 1 },
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
                    legend: { position: 'none' },
                    tooltip: { isHtml: true },
                    animation: {
                      duration: this.state.shouldAnimate ? 500 : 0,
                      easing: 'out',
                    },
                  }}
                  graph_id={this.props.graph_id}
                  width="auto"
                  height="100%"
                  chartEvents={[
                    {
                      eventName: 'select',
                      callback: ({ chartWrapper }) => {
                        let selected = chartWrapper.getChart().getSelection();
                        // This event also fires when de-selecting a point,
                        // in which case, selected is an empty array.
                        if (selected.length > 0) {
                          let row = selected[0].row as number;
                          this.props.onClickDate(dataAsRows[row][0]);
                        }
                      },
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        );
      }

      private buildDataMap = () => {
        let dataMapByDate: { [s: string]: PerDayTransactions } = {};

        if (
          !this.props.transactions.length ||
        !this.props.spendTarget.targets.length
        ) {
          return dataMapByDate;
        }

        const targets = this.props.spendTarget.targets;
        const startDates = targets.map(spendTarget =>
          moment(spendTarget.startDate)
        );
        const endDate = moment(this.props.transactions[0].date);

        let targetIndex = 0;
        for (
          let m = startDates[0].clone();
          m.isSameOrBefore(endDate);
          m.add(1, 'days')
        ) {
          if (targetIndex + 1 < targets.length) {
            if (startDates[targetIndex + 1].isSameOrBefore(m)) {
              ++targetIndex;
            }
          }
          const dailyBudgetCents = targets[targetIndex].targetAnnualCents / 365;
          dataMapByDate[m.format('YYYY-MM-DD')] = [
            {
              amountCents: -dailyBudgetCents,
              description: 'daily budget',
            },
          ];
        }

        for (let transaction of this.props.transactions) {
          let spreadDuration = TransactionUtils.getSpreadDurationAsDays(
              transaction
          );
          if (this.state.useSpread && spreadDuration !== undefined) {
            let spreadStartDate = moment(transaction.date);
            let spreadEndDate = moment.min(
                spreadStartDate.clone().add(spreadDuration - 1, 'days'),
                endDate
            );
            for (
              let m = spreadStartDate.clone();
              m.isSameOrBefore(spreadEndDate);
              m.add(1, 'days')
            ) {
              let daysLeft = spreadDuration - 1 - m.diff(spreadStartDate, 'days');
              dataMapByDate[m.format('YYYY-MM-DD')].push({
                amountCents: transaction.amount_cents / spreadDuration,
                description: transaction.description,
                notes: transaction.notes,
                daysLeft: !daysLeft
                  ? 'last day!'
                  : daysLeft == 1
                    ? '1 day left'
                    : `${daysLeft} days left`,
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
      };

      private formatDataAsRows = (dataMapByDate: {
        [s: string]: PerDayTransactions;
      }): [Date, number | null, number, string][] => {
        let dates = Object.keys(dataMapByDate).sort();
        if (!dates.length) {
          return [[moment().toDate(), 0, 0, '']];
        }

        // We want the y-axis on the right side only. To do this, we create a
        // fake data set for the left y-axis.
        let dataAsRows: [Date, number | null, number, string][] = [];
        let currentTotal = -this.props.spendTarget.startBalanceCents;
        for (
          let m = moment(dates[0]);
          m.isSameOrBefore(moment(dates[dates.length - 1]));
          m = m.add(1, 'days')
        ) {
          let currentDate = m.format('YYYY-MM-DD');
          let toolTipHtml = '<table>';
          for (let transaction of dataMapByDate[currentDate]) {
            currentTotal -= transaction.amountCents;
            let amount = TransactionUtils.formatAmountNumber(
                transaction.amountCents
            );
            let notes = transaction.notes
              ? ` - <span class='notes'>${transaction.notes}</span>`
              : '';
            let daysLeft = transaction.daysLeft
              ? ` <span class='notes'>(${transaction.daysLeft})</span>`
              : '';
            toolTipHtml += `<tr><td>${amount}</td><td>${transaction.description}${notes}${daysLeft}</td></tr>`;
          }
          toolTipHtml += '</table>';

          toolTipHtml = `<div><strong>${TransactionUtils.formatAmountNumber(
              currentTotal
          )}</strong> on <strong>${m.format(
              'MMM D, YYYY'
          )}</strong></div>${toolTipHtml}`;

          dataAsRows.push([
            m.toDate(),
            dataAsRows.length ? null : 0,
            Math.round(currentTotal) / 100,
            toolTipHtml,
          ]);
        }
        return dataAsRows;
      };

      private showEndOfGraph = () => {
        if (!this.container) {
          console.log('container not set (showEndOfGraph)');
          return;
        }
        this.container.scrollLeft = this.container.scrollWidth;
      };
    }
);

export default DailyGraph;
