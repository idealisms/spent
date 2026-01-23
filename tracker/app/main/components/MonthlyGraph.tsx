import { Theme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { Chart } from 'react-google-charts';
import { GoogleDataTableCell } from 'react-google-charts/dist/types';

const useStyles = makeStyles()((_theme: Theme) => ({
  root: {
    flex: '0 1 400px',
    padding: '8px 16px',
    maxHeight: 'calc(50% - 64px)',
    '@media (max-width: 420px)': {
      paddingBottom: '0',
    },
  },
}));
interface IMonthlyGraphProps {
  data: [Date, number, number][];
  graph_id: string;
}
interface IMonthlyGraphState {}

interface IMonthlyGraphInnerProps extends IMonthlyGraphProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class MonthlyGraphInner extends React.Component<
  IMonthlyGraphInnerProps,
  IMonthlyGraphState
> {
  public render(): React.ReactElement<Record<string, unknown>> {
    let classes = this.props.classes;

    return (
      <div className={classes.root}>
        <Chart
          chartType="ComboChart"
          columns={[
            { label: 'Date', type: 'date' },
            { label: 'Spent', type: 'number' },
            { label: 'Balance', type: 'number' },
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
            legend: { position: 'none' },
          }}
          graph_id={this.props.graph_id}
          width="auto"
          height="100%"
        />
      </div>
    );
  }
}

function MonthlyGraphWrapper(props: IMonthlyGraphProps) {
  const { classes } = useStyles();
  return <MonthlyGraphInner {...props} classes={classes} />;
}

export default MonthlyGraphWrapper;
