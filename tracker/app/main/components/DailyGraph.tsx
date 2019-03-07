import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import moment from 'moment';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import { ITransaction } from '../../transactions';

const styles = (theme: Theme) => createStyles({
  root: {
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
  startBalanceCents: number;
  graph_id: string;
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
      // let startTime = performance.now();

      let dailyTotals: { [s: string]: number; } = {};
      for (let m = moment(this.props.startDate); m.isSameOrBefore(moment(this.props.endDate)); m = m.add(1, 'days')) {
        dailyTotals[m.format('YYYY-MM-DD')] = 0;
      }

      for (let transaction of this.props.transactions) {
        dailyTotals[transaction.date] += transaction.amount_cents;
      }

      let currentTotal = this.props.startBalanceCents;
      for (let m = moment(this.props.startDate); m.isSameOrBefore(moment(this.props.endDate)); m = m.add(1, 'days')) {
        let currentDate = m.format('YYYY-MM-DD');
        currentTotal += dailyTotals[currentDate] - this.props.dailyBudgetCents;
        data.push([currentDate, currentTotal / 100.0]);
      }
      // This takes about 41ms on my laptop when loading 1168 transactions.
      // Memoizing (e.g., using memoize-one) would help save that time when
      // resizing, although since that's not the main time sink, ignore it
      // for now.
      // console.log(performance.now() - startTime);
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
        <div className={classes.root} ref={(elt) => this.container = elt}>
          <Chart
              chartType='LineChart'
              columns={[{'label': 'Date', 'type': 'string'}, {'label':'Dollars', 'type':'number'}]}
              rows={data}
              options={{'hAxis': {'title': 'Date'}, 'vAxis': {'title': 'Dollars'}, 'legend': 'none'}}
              graph_id={this.props.graph_id}
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
