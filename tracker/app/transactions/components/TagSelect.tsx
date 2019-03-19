import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import CreatableSelect from 'react-select/lib/Creatable';
import { ValueType } from 'react-select/lib/types';
import { IAppState } from '../../main';
import { ITransaction } from '../Model';

const styles = (theme: Theme) => createStyles({
  root: {
  },
});
interface ITagSelectOwnProps extends WithStyles<typeof styles> {
  onChange: (tags: string[]) => void;
  value?: string[];
  /** Transactions to extract tag names from. If undefined, all transactions
   *  will be used.
   */
  transactions?: ITransaction[];
  allowNewTags?: boolean;
  showCategories?: boolean;
  showCounts?: boolean;
}
interface ITagSelectPassThroughProps {
  className?: string;
  isDisabled?: boolean;
  createOptionPosition?: 'first' | 'last';
  placeholder?: string;
  autoFocus?: boolean;
}
interface ITagSelectAppStateProps {
  allTransactions: ITransaction[];
}
type ITagSelectProps = ITagSelectOwnProps & ITagSelectPassThroughProps & ITagSelectAppStateProps;
interface ITagSelectState {
}
const TagSelect = withStyles(styles)(
class extends React.Component<ITagSelectProps, ITagSelectState> {

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let transactions = this.props.transactions || this.props.allTransactions;

    let tagMap: Map<string, number> = new Map();
    for (let transaction of transactions) {
      for (let tag of transaction.tags) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }

    let suggestions = new Array(...tagMap.keys()).sort().map(
      tag => {
        let label = tag;
        if (this.props.showCounts) {
          label += ` (${tagMap.get(tag)})`;
        }
        return {
          label,
          value: tag,
        };
      },
    );

    let componentProps = {
      // Pass through props.
      className: `${classes.root} ${this.props.className ? this.props.className : ''}`,
      isDisabled: this.props.isDisabled,
      createOptionPosition: this.props.createOptionPosition,
      placeholder: this.props.placeholder,
      autoFocus: this.props.autoFocus,

      isMulti: true,
      options: suggestions,
      onChange: this.handleChangeTags,
      value: this.props.value ? this.props.value.map(t => ({label: t, value: t})) : undefined,
    };

    if (this.props.allowNewTags) {
      return <CreatableSelect
          {...componentProps}
          formatCreateLabel={inputValue => <span>New tag: {inputValue}</span>}
          />;
    } else {
      return <Select {...componentProps} />;
    }
  }

  private handleChangeTags = (tags: ValueType<{label: string, value: string}>, action: any): void => {
    this.setState({
      tags,
    });

    if (Array.isArray(tags)) {
      this.props.onChange(tags.map(valueType => valueType.value));
    } else {
      this.props.onChange([]);
    }
  }
});

const mapStateToProps = (state: IAppState): ITagSelectAppStateProps => ({
  allTransactions: state.transactions.transactions,
});

export default connect(mapStateToProps, {})(TagSelect);
