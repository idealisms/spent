import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import { Theme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ITransaction,
  Transaction,
  TransactionsTable,
  TransactionsTableHeadingRow,
  TransactionsTableSumRow,
  TransactionUtils,
} from '../../transactions';
import { IAppState, ISpendTarget } from '../model';
import MenuBarWithDrawer from './MenuBarWithDrawer';
import MonthlyGraph from './MonthlyGraph';
import * as Pages from './RoutePaths';

const useStyles = makeStyles()((_theme: Theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  controls: {
    flex: 'none',
    margin: '16px',
  },
  transactionsTable: {
    flex: 1,
    overflow: 'auto',
    borderTop: '1px solid lightgrey',
  },
  transactionsTableHeader: {
    lineHeight: 'inherit',
  },
  transactionsTableSpacer: {
    borderBottom: 'none',
    height: '48px',
  },
  transactionsTableBalanceAmount: {
    '&.credit': {
      color: 'rgba(255, 0, 0, .54)',
    },
  },
}));
interface IMonthlyOwnProps {}
interface IMonthlyAppStateProps {
  transactions: ITransaction[];
  spendTargets: ISpendTarget[];
}
interface IMonthlyDispatchProps {}
type IMonthlyProps = IMonthlyOwnProps &
  IMonthlyAppStateProps &
  IMonthlyDispatchProps;

interface IMonthlyInnerProps extends IMonthlyProps {
  classes: ReturnType<typeof useStyles>['classes'];
  location: ReturnType<typeof useLocation>;
  navigateTo: ReturnType<typeof useNavigate>;
}
interface IMonthlyState {}

class MonthlyInner extends React.Component<IMonthlyInnerProps, IMonthlyState> {
  constructor(props: IMonthlyInnerProps) {
    super(props);
    this.state = {};
  }

  public render(): React.ReactElement<Record<string, unknown>> {
    let classes = this.props.classes;
    let spendTarget;

    if (this.props.spendTargets.length > 0) {
      spendTarget = this.props.spendTargets[0];

      // Construct a fake URL so we can parse the search param even if
      // we are using a hash history.
      let url = new URL(
        'https://www.example.com/' + this.props.location.search
      );
      let spendTargetName = url.searchParams.get('t');
      for (let i = 0; i < this.props.spendTargets.length; ++i) {
        if (this.props.spendTargets[i].name == spendTargetName) {
          spendTarget = this.props.spendTargets[i];
          break;
        }
      }
    }
    let startDate = spendTarget
      ? moment(spendTarget.startDate).toDate()
      : moment().startOf('day').toDate();
    let endDate = spendTarget
      ? moment(spendTarget.endDate).toDate()
      : moment().startOf('day').toDate();
    let filteredTransactions = TransactionUtils.filterTransactions(
      this.props.transactions,
      {
        startDate,
        endDate,
        tagsIncludeAny: spendTarget && spendTarget.tags.include,
        tagsExcludeAny: spendTarget && spendTarget.tags.exclude,
      }
    );
    let [rows, data] = this.groupByMonths(filteredTransactions, spendTarget);

    return (
      <div className={classes.root}>
        <MenuBarWithDrawer title="Monthly" />

        <MonthlyGraph graph_id="monthly-budget-chart" data={data} />

        <div className={classes.controls}>
          <Select
            value={spendTarget ? spendTarget.name : ''}
            onChange={this.handleSelectSpendTarget}
            input={
              <OutlinedInput margin="dense" name="Target" />
            }
          >
            {this.props.spendTargets.map(target => (
              <MenuItem value={target.name} key={target.name}>
                {target.name}
              </MenuItem>
            ))}
          </Select>
        </div>
        <TransactionsTable
          classes={{ root: classes.transactionsTable }}
          lazyRender
        >
          {rows}
        </TransactionsTable>
      </div>
    );
  }

  public handleSelectSpendTarget = (event: any): void => {
    let spendTargetName = event.target.value;
    this.props.navigateTo(
      Pages.MonthlyPage + `?t=${encodeURIComponent(spendTargetName)}`
    );
  };

  private groupByMonths = (
    transactions: ITransaction[],
    spendTarget?: ISpendTarget
  ): [JSX.Element[], [Date, number, number][]] => {
    let classes = this.props.classes;
    let rows: JSX.Element[] = [];
    let data: [Date, number, number][] = [];

    // Pre-allocate each month with the monthly balance.
    const monthlyBudgetCents = spendTarget
      ? Math.floor(spendTarget.targetAnnualCents / 12)
      : 0;
    let monthlySpendingMap: Map<string, number> = new Map();
    if (transactions.length > 0) {
      let startMonth = moment(transactions[transactions.length - 1].date)
        .date(1)
        .startOf('day');
      let endMonth = moment(transactions[0].date).date(1).startOf('day');
      for (
        let m = startMonth;
        m.isSameOrBefore(endMonth);
        m = m.add(1, 'months')
      ) {
        monthlySpendingMap.set(m.format('YYYY-MM'), monthlyBudgetCents);
      }
    }

    // Fill in the spending for each month in monthlySpendingMap and allocate
    // a map of months to transactions to be used below.
    let monthlyTransactionsMap: Map<string, ITransaction[]> = new Map();
    transactions.forEach(t => {
      let month = moment(t.date).format('YYYY-MM');
      let arr = monthlyTransactionsMap.get(month);
      if (arr) {
        arr.push(t);
      } else {
        monthlyTransactionsMap.set(month, [t]);
      }
      monthlySpendingMap.set(
        month,
        (monthlySpendingMap.get(month) || 0) - t.amount_cents
      );
    });

    // Now convert monthlySpendingMap to be a rolling total.
    [...monthlySpendingMap.keys()].sort().reduce(
      (total: number, month: string): number => {
        let monthlySpend = monthlySpendingMap.get(month) || 0;
        total += monthlySpend;
        monthlySpendingMap.set(month, total);
        data.push([
          moment(month).toDate(),
          (monthlyBudgetCents - monthlySpend) / 100.0,
          total / 100.0,
        ]);
        return total;
      },
      spendTarget ? -spendTarget.startBalanceCents : 0
    );

    let lastMonth = '';
    let lastMonthTransactions: ITransaction[] | undefined;
    for (let t of transactions) {
      let month = moment(t.date).format('YYYY-MM');
      if (lastMonth != month) {
        lastMonthTransactions = monthlyTransactionsMap.get(lastMonth);
        if (lastMonthTransactions) {
          rows.push(
            ...this.monthlySumRows(
              lastMonth,
              lastMonthTransactions,
              monthlySpendingMap
            )
          );
          rows.push(
            <TransactionsTableHeadingRow
              key={`spacer-${lastMonth}`}
              classes={{ row: classes.transactionsTableSpacer }}
            />
          );
        }
        let headerText = moment(t.date).format('MMMM YYYY');
        rows.push(
          <TransactionsTableHeadingRow key={`header-${month}`}>
            <Typography
              variant="h6"
              classes={{ root: classes.transactionsTableHeader }}
            >
              {headerText}
            </Typography>
          </TransactionsTableHeadingRow>
        );
        lastMonth = month;
      }
      rows.push(<Transaction transaction={t} key={t.id} />);
    }
    lastMonthTransactions = monthlyTransactionsMap.get(lastMonth);
    if (lastMonthTransactions) {
      rows.push(
        ...this.monthlySumRows(
          lastMonth,
          lastMonthTransactions,
          monthlySpendingMap
        )
      );
    }

    return [rows, data];
  };

  private monthlySumRows = (
    month: string,
    transactions: ITransaction[],
    monthlySpendingMap: Map<string, number>
  ): JSX.Element[] => {
    let classes = this.props.classes;
    return [
      <TransactionsTableSumRow
        key={`month-sum-${month}`}
        transactions={transactions}
        description="monthly total"
      />,
      <TransactionsTableSumRow
        key={`balance-${month}`}
        transactions={[
          {
            id: '',
            description: '',
            original_line: '',
            date: `${month}-01`,
            tags: [],
            amount_cents: monthlySpendingMap.get(month) || 0,
            transactions: [],
          },
        ]}
        description="balance"
        classes={{ amount: classes.transactionsTableBalanceAmount }}
      />,
    ];
  };
}

function MonthlyWrapper(props: IMonthlyProps) {
  const { classes } = useStyles();
  const location = useLocation();
  const navigateTo = useNavigate();
  return <MonthlyInner {...props} classes={classes} location={location} navigateTo={navigateTo} />;
}

const mapStateToProps = (state: IAppState): IMonthlyAppStateProps => ({
  transactions: state.transactions.transactions,
  spendTargets: state.settings.settings.spendTargets,
});

export default connect(mapStateToProps)(MonthlyWrapper);
