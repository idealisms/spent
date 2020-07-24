import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import { GoogleDataTableCell } from 'react-google-charts/dist/types';

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
interface IMonthlyGraphProps extends WithStyles<typeof styles> {
  data: [Date, number, number][];
  graph_id: string;
}
interface IMonthlyGraphState {
}
const MonthlyGraph = withStyles(styles)(
    class extends React.Component<IMonthlyGraphProps, IMonthlyGraphState> {

      public render(): React.ReactElement<object> {
        let classes = this.props.classes;

        return (
          <div className={classes.root}>
            <Chart
              chartType='ComboChart'
              columns={[
                {label: 'Date', type: 'date'},
                {label: 'Spent', type: 'number'},
                {label: 'Balance', type: 'number'},
              ]}
              rows={this.props.data as GoogleDataTableCell[][]}
              options={{
                chartArea: {
                  top: 16,
                  right: 16,
                  bottom: 32,
                  left: 80,
                },
                seriesType: 'bars',
                series: { 1: { type: 'line' } },
                hAxis: {
                  title: '',
                  textStyle: {
                    fontSize: 13,
                  },
                },
                vAxis: {
                  title: '',
                  format: '¤#,###',
                  textPosition: 'out',
                  textStyle: {
                    fontSize: 16,
                  },
                },
                legend: {position: 'none'},
              }}
              graph_id={this.props.graph_id}
              width='auto'
              height='100%'
            />
          </div>);
      }
    });

export default MonthlyGraph;
