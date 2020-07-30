import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import * as React from 'react';
import { Category, ITransaction } from '../Model';
import { categoryToEmoji, formatAmount, getCategory } from '../utils';

export const styles = (theme: Theme) => createStyles({
  row: {
    display: 'flex',
    borderBottom: '1px solid lightgrey',
    height: '47px',
    '&.selected': {
      backgroundColor: '#eee',
    },
    '&.selected > $category': {
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
    // These are the spans around tags.
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
    // This causes text to overflow to the left, keeping
    // the numbers right aligned.
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
});

interface ITransactionProps extends WithStyles<typeof styles> {
  transaction: ITransaction;
  key?: string;
  isSelected?: boolean;
  onCategoryClick?: (transaction: ITransaction) => void;
  hideDate?: boolean;
  hideTags?: boolean;
  amountFragment?: JSX.Element;
}
const Transaction = withStyles(styles)(
    class Component extends React.Component<ITransactionProps, Record<string, unknown>> {

      public render(): React.ReactElement<Record<string, unknown>> {
        let classes = this.props.classes;
        let isCredit = this.props.transaction.amount_cents < 0;
        let categoryEmoji = '🙅';
        let categoryName = 'error';
        try {
          let category = this.getCategory();
          categoryEmoji = categoryToEmoji(category);
          categoryName = Category[category];
        } catch(e) {
          console.log(e);
        }
        // Use a zero width space (\u200B) so double clicking a tag only
        // selects the tag and not the words around it.
        let tags = this.props.transaction.tags.map(tag => ['\u200B', <span key={tag}>{tag}</span>]);
        return (
          <div
            className={classes.row + (this.props.isSelected ? ' selected' : '')}
            key={this.props.key ? this.props.key : ''}>
            {this.props.hideDate
              ? ''
              : <div className={classes.date}>
                <span className='y'>{this.props.transaction.date.substr(0, 5)}</span>
                {this.props.transaction.date.substr(5)}
              </div>}
            {this.props.amountFragment
              ? this.props.amountFragment
              : <div className={classes.amount + (isCredit ? ' credit' : '')}>{this.formatAmount()}</div>}
            <div
              className={classes.category + (this.props.onCategoryClick ? ' editable' : '')}
              title={categoryName}
              onClick={() => {
                if (this.props.onCategoryClick) {
                  this.props.onCategoryClick(this.props.transaction);
                }
              }}
            >{this.props.isSelected ? <CheckBoxIcon /> : categoryEmoji}</div>
            <div className={classes.description}>
              {this.props.transaction.description}
              {this.props.transaction.notes ? <span className='notes'> - {this.props.transaction.notes}</span> : ''}
              {this.props.hideTags ? '' : tags}
            </div>
          </div>
        );
      }

      protected formatAmount(): string {
        return formatAmount(this.props.transaction);
      }

      protected getCategory(): Category {
        return getCategory(this.props.transaction);
      }
    });

export default Transaction;
