import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as moment from 'moment';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import { DAILY_EXCLUDE_TAGS, ITransaction, TransactionUtils } from '../../transactions';

const styles = (theme: Theme) => createStyles({
  chart: {
    flex: '0 1 400px',
    padding: '8px 16px',
    maxHeight: 'calc(50% - 64px)',
    '@media (max-width: 420px)': {
      paddingBottom: '0',
    },
  },
});
interface IDailyGraphProps extends WithStyles<typeof styles> {
  transactions: ITransaction[];
  startDate: Date;
  endDate: Date;
  dailyBudgetCents: number;
}
interface IDailyGraphState {
  containerWidth: number;
}
const DailyGraph = withStyles(styles)(
class extends React.Component<IDailyGraphProps, IDailyGraphState> {
  private container: HTMLElement|null = null;

  constructor(props: IDailyGraphProps, context?: any) {
    super(props, context);
    this.state = {
      containerWidth: -1,
    };
  }

  public componentDidMount(): void {
    if (!this.container) {
      console.log('container not set (componentDidMount)');
      return;
    }
    this.setState({
      containerWidth: this.container.offsetWidth,
    });
    window.addEventListener('resize', this.handleWindowResize);
  }

  public componentWillUnmount(): void {
    window.removeEventListener('resize', this.handleWindowResize);
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let data: [string, number][] = [];

    if (this.props.transactions.length && this.state.containerWidth != -1) {
      // TODO: Move this into the constructor. We don't need to recompute
      // this on every render.
      let dailyTotals: { [s: string]: number; } = {};
      for (let m = moment(this.props.startDate); m.isSameOrBefore(moment(this.props.endDate)); m = m.add(1, 'days')) {
        dailyTotals[m.format('YYYY-MM-DD')] = 0;
      }

      for (let transaction of this.props.transactions) {
        if (TransactionUtils.shouldExclude(transaction, DAILY_EXCLUDE_TAGS)) {
          continue;
        }

        dailyTotals[transaction.date] += transaction.amount_cents;
      }

      let currentTotal = 0;
      for (let m = moment(this.props.startDate); m.isSameOrBefore(moment(this.props.endDate)); m = m.add(1, 'days')) {
        let currentDate = m.format('YYYY-MM-DD');
        currentTotal += dailyTotals[currentDate] - this.props.dailyBudgetCents;
        data.push([currentDate, currentTotal / 100.0]);
      }
    } else {
      data.push([moment().format('YYYY-MM-DD'), 0]);
    }
    if (this.state.containerWidth != -1) {
      // Limit the number of graph points based on how much space we have.
      let maxToShow = Math.max(Math.round(this.state.containerWidth / 10), 31);
      if (maxToShow < data.length) {
        data = data.slice(data.length - maxToShow);
      }
    }

    return (
        <div className={classes.chart} ref={(elt) => this.container = elt}>
          <Chart
              chartType='LineChart'
              columns={[{'label': 'Date', 'type': 'string'}, {'label':'Dollars', 'type':'number'}]}
              rows={data}
              options={{'hAxis': {'title': 'Date'}, 'vAxis': {'title': 'Dollars'}, 'legend': 'none'}}
              graph_id='daily-spend-chart'
              width='auto'
              height='100%'
            />
        </div>);
  }

  private handleWindowResize = () => {
    if (!this.container) {
      console.log('container not set (handleWindowResize)');
      return;
    }
    this.setState({
      containerWidth: this.container.offsetWidth,
    });
  }
});

export default DailyGraph;
