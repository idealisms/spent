import { Theme } from '@mui/material/styles';
import * as React from 'react';
import { makeStyles } from 'tss-react/mui';

const useRowStyles = makeStyles()((theme: Theme) => ({
  row: {
    display: 'flex',
    borderBottom: '1px solid lightgrey',
    height: '47px',
    padding: '0 16px',
    color: theme.palette.text.primary,
    '&.selected': {
      backgroundColor: '#eee',
    },
    '&.selected > .category': {
      marginTop: '4px',
      color: theme.palette.text.secondary,
    },
  },
  date: {
    whiteSpace: 'nowrap',
    fontSize: '70%',
    marginLeft: '16px',
    flex: 'none',
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
    '&.editable': {
      cursor: 'pointer',
    },
  },
}));

interface ITransactionsTableHeadingRowProps {
  classes: ReturnType<typeof useRowStyles>['classes'];
  children?: React.ReactNode;
}
interface ITransactionsTableHeadingRowState {}

class TransactionsTableHeadingRowInner extends React.Component<
  ITransactionsTableHeadingRowProps,
  ITransactionsTableHeadingRowState
> {
  public render(): React.ReactElement<Record<string, unknown>> {
    let classes = this.props.classes;

    return <div className={classes.row}>{this.props.children}</div>;
  }
}

export interface ITransactionsTableHeadingRowPublicProps extends Omit<ITransactionsTableHeadingRowProps, 'classes'> {
  classes?: Partial<ReturnType<typeof useRowStyles>['classes']>;
}

function TransactionsTableHeadingRow(
  props: ITransactionsTableHeadingRowPublicProps
) {
  const { classes: defaultClasses, cx } = useRowStyles();
  const classes = Object.fromEntries(
    Object.keys(defaultClasses).map(key => [
      key,
      cx(defaultClasses[key as keyof typeof defaultClasses], props.classes?.[key as keyof typeof defaultClasses]),
    ]),
  ) as typeof defaultClasses;
  return <TransactionsTableHeadingRowInner {...props} classes={classes} />;
}

export default TransactionsTableHeadingRow;
