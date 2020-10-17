import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import { css } from 'emotion';
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import { OptionProps } from 'react-select/lib/components/Option';
import CreatableSelect from 'react-select/lib/Creatable';
import { Props } from 'react-select/lib/Select';
import { ValueType } from 'react-select/lib/types';
import { IAppState } from '../../main';
import { ITransaction, TAG_TO_CATEGORY } from '../model';
import { categoryToEmoji } from '../utils';

const styles = (_theme: Theme) =>
  createStyles({
    option: {
      display: 'flex !important',
      flexDirection: 'row',
      alignItems: 'center',
      '& .cat': {
        width: '24px',
        textAlign: 'center',
        flex: 'none',
        marginRight: '8px',
      },
      '& .lbl': {
        flex: '1 0 auto',
      },
      '& .cnt': {
        flex: '0 0 auto',
        color: 'rgba(0, 0, 0, .54)',
      },
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
  hideCategories?: boolean;
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
type ITagSelectProps = ITagSelectOwnProps &
ITagSelectPassThroughProps &
ITagSelectAppStateProps;
interface ITagSelectState {}
const TagSelect = withStyles(styles)(
    class Component extends React.Component<ITagSelectProps, ITagSelectState> {
      public render(): React.ReactElement<Record<string, unknown>> {
        let transactions = this.props.transactions || this.props.allTransactions;

        let tagMap: Map<string, number> = new Map();
        for (let transaction of transactions) {
          for (let tag of transaction.tags) {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
          }
        }

        let suggestions = new Array(...tagMap.keys())
          .sort()
          .map(tag => ({ label: tag, value: tag }));

        let Option = this.getOptionClass(tagMap);
        let MultiValueLabel = this.getMultiValueLabelClass();

        let componentProps: Props = {
        // Pass through props.
          className: this.props.className,
          isDisabled: this.props.isDisabled,
          createOptionPosition: this.props.createOptionPosition,
          placeholder: this.props.placeholder,
          autoFocus: this.props.autoFocus,
          menuPortalTarget: document.body,
          menuPosition: 'absolute',
          // Dialogs are children of document.body with a zIndex of 1300.
          styles: { menuPortal: base => ({ ...base, zIndex: 2000 }) },

          components: { Option, MultiValueLabel },
          isMulti: true,
          options: suggestions,
          onChange: this.handleChangeTags,
          value: this.props.value
            ? this.props.value.map(t => ({ label: t, value: t }))
            : undefined,
        };

        if (this.props.allowNewTags) {
          return (
            <CreatableSelect
              {...componentProps}
              formatCreateLabel={inputValue => <span>New tag: {inputValue}</span>}
            />
          );
        } else {
          return <Select {...componentProps} />;
        }
      }

      private handleChangeTags = (
          tags: ValueType<{ label: string; value: string }>,
          _action: any
      ): void => {
        this.setState({
          tags,
        });

        if (Array.isArray(tags)) {
          this.props.onChange(tags.map(valueType => valueType.value));
        } else {
          this.props.onChange([]);
        }
      };

      private getOptionClass = (
          tagMap: Map<string, number>
      ): React.FunctionComponent<
      OptionProps<{ label: string; value: string }>
      > => {
        let hideCategories = this.props.hideCategories;
        let showCounts = this.props.showCounts;
        let renderChild = (tag: string): JSX.Element => {
          let categoryNode: JSX.Element | undefined;
          if (!hideCategories) {
            let category = TAG_TO_CATEGORY.get(tag);
            let emoji = category ? categoryToEmoji(category) : '';
            categoryNode = <span className="cat">{emoji}</span>;
          }
          let countNode: JSX.Element | undefined;
          if (showCounts) {
            let count = tagMap.get(tag) || 0;
            countNode = <span className="cnt">{count}</span>;
          }
          return (
            <React.Fragment>
              {hideCategories ? '' : categoryNode}
              <span className="lbl">{tag}</span>
              {showCounts ? countNode : ''}
            </React.Fragment>
          );
        };

        let classes = this.props.classes;
        return props => {
          const {
            className,
            cx,
            getStyles,
            isDisabled,
            isFocused,
            isSelected,
            innerRef,
            innerProps,
          } = props;
          return (
            <div
              ref={innerRef}
              className={
                `${classes.option} ` +
              (cx(
                  css(getStyles('option', props)),
                  {
                    option: true,
                    'option--is-disabled': isDisabled,
                    'option--is-focused': isFocused,
                    'option--is-selected': isSelected,
                  },
                  className
              ) || '')
              }
              {...innerProps}
            >
              {renderChild(props.label)}
            </div>
          );
        };
      };

      private getMultiValueLabelClass = (): React.FunctionComponent<
      OptionProps<{ label: string; value: string }>
      > => {
      // let classes = this.props.classes;
        let hideCategories = this.props.hideCategories;
        return props => {
          let category = TAG_TO_CATEGORY.get(props.data.label);
          let emoji =
          !hideCategories && category ? categoryToEmoji(category) + ' ' : '';
          return (
            <div {...props.innerProps}>
              {emoji}
              {props.children}
            </div>
          );
        };
      };
    }
);

const mapStateToProps = (state: IAppState): ITagSelectAppStateProps => ({
  allTransactions: state.transactions.transactions,
});

export default connect(mapStateToProps, {})(TagSelect);
