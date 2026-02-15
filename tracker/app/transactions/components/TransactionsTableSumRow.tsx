import { Theme } from '@mui/material/styles';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import * as React from 'react';
import { makeStyles } from 'tss-react/mui';
import { ITransaction } from '../model';
import { formatAmountNumber } from '../utils';

const useHeaderStyles = makeStyles()((theme: Theme) => ({
  row: {
    display: 'flex',
    borderBottom: '1px solid lightgrey',
    height: '47px',
    color: theme.palette.text.secondary,
    '&.selected': {
      backgroundColor: '#eee',
    },
    '&.selected > .category': {
      marginTop: '4px',
      color: theme.palette.text.secondary,
    },
  },
  date: {
    whiteSpace: 'nowrap' as const,
    fontSize: '70%',
    marginLeft: '16px',
    flex: 'none',
    visibility: 'hidden' as const,
    '@media (max-width: 420px)': {
      '& .y': {
        display: 'none',
      },
    },
  },
  description: {
    whiteSpace: 'nowrap',
    marginLeft: '16px',
    flex: '1 1 auto',
    overflow: 'auto',
    '& > .notes': {
      color: '#9e9e9e',
    },
    '& > span:not(.notes)': {
      backgroundColor: '#ddd',
      borderRadius: '4px',
      padding: '4px 8px',
      marginLeft: '8px',
      color: '#666',
    },
  },
  amount: {
    whiteSpace: 'nowrap',
    textAlign: 'right',
    marginLeft: '16px',
    flex: '0 0 80px',
    '&.credit': {
      color: 'green',
    },
    width: '80px',
    direction: 'rtl',
  },
  category: {
    marginLeft: '16px',
    fontSize: '24px',
    textAlign: 'center',
    flex: '0 0 32px',
    width: '32px',
    marginTop: '4px',
    color: theme.palette.text.secondary,
    '&.editable': {
      cursor: 'pointer',
    },
  },
}));

interface ITransactionsTableSumRowProps {
  classes: ReturnType<typeof useHeaderStyles>['classes'];
  transactions: ITransaction[];
  selectAllChecked?: boolean;
  onSelectAllClick?: (selectAll: boolean) => void;
  description?: string;
}
interface ITransactionsTableSumRowState {}

class TransactionsTableSumRowInner extends React.Component<
  ITransactionsTableSumRowProps,
  ITransactionsTableSumRowState
> {
  public render(): React.ReactElement<Record<string, unknown>> {
    let classes = this.props.classes;

    let totalAmount = this.props.transactions.reduce(
      (total, transaction) => total + transaction.amount_cents,
      0
    );
    let isCredit = totalAmount < 0;
    let description =
      this.props.description ||
      (this.props.transactions.length == 1
        ? '1 transaction'
        : `${this.props.transactions.length} transactions`);
    return (
      <div className={classes.row}>
        <div className={classes.date}>
          <span className="y">2000-</span>01-01
        </div>
        <div className={classes.amount + (isCredit ? ' credit' : '')}>
          {formatAmountNumber(totalAmount)}
        </div>
        {this.props.onSelectAllClick ? (
          <div
            className={classes.category + ' editable'}
            title="Select All"
            onClick={this.handleSelectAllClick}
          >
            {this.props.selectAllChecked ? (
              <CheckBoxIcon />
            ) : (
              <CheckBoxOutlineBlankIcon />
            )}
          </div>
        ) : (
          <div className={classes.category}></div>
        )}
        <div className={classes.description}>{description}</div>
      </div>
    );
  }

  private handleSelectAllClick = (): void => {
    if (this.props.onSelectAllClick) {
      this.props.onSelectAllClick(!this.props.selectAllChecked);
    }
  };
}

export interface ITransactionsTableSumRowPublicProps extends Omit<ITransactionsTableSumRowProps, 'classes'> {
  classes?: Partial<ReturnType<typeof useHeaderStyles>['classes']>;
}

function TransactionsTableSumRow(
  props: ITransactionsTableSumRowPublicProps
) {
  const { classes: defaultClasses, cx } = useHeaderStyles();
  const classes = Object.fromEntries(
    Object.keys(defaultClasses).map(key => [
      key,
      cx(defaultClasses[key as keyof typeof defaultClasses], props.classes?.[key as keyof typeof defaultClasses]),
    ]),
  ) as typeof defaultClasses;
  return <TransactionsTableSumRowInner {...props} classes={classes} />;
}

export default TransactionsTableSumRow;
