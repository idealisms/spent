import { Button, createStyles, Drawer, FormControl, Hidden, InputLabel, MenuItem, Select, TextField, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import moment from 'moment';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { Category, ITransaction, TAG_TO_CATEGORY, Transaction, TransactionsTable, TransactionUtils } from '../../transactions';
import { fetchTransactionsFromDropboxIfNeeded } from '../../transactions/actions';
import { fetchSettingsFromDropboxIfNeeded, saveSettingsToDropbox, updateSetting } from '../actions';
import { CloudState, IAppState, IReportNode } from '../Model';
import ReportMenuBar from './ReportMenuBar';


const LOADING_TEXT = 'loading...';

const styles = (theme: Theme) => createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  contentAndDrawerContainer: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'auto',
    alignItems: 'stretch',
  },
  content: {
    flexGrow: 1,
    overflow: 'auto',
  },
  drawer: {
    width: 0,
    flexShrink: 0,
    overflow: 'hidden auto',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    '&.open': {
      width: '420px',
    },
  },
  drawerContentsContainer: {
    width: '420px',
  },
  drawerPaper: {
    width: '90%',
    maxWidth: '420px',
    minWidth: '16px',
  },
  drawerContents: {
    padding: '16px',
  },
  controls: {
    display: 'flex',
    marginTop: '16px',
  },
  jsonCategoriesInput: {
    minHeight: '360px',
    maxHeight: '600px',
  },
  jsonCategoriesTextField: {
    width: '100%',
    marginTop: '16px',
  },
  saveButton: {
    marginTop: '16px',
  },
  renderedTree: {
    maxHeight: '600px',
    margin: '16px',
    overflow: 'auto',
    '& > .row': {
      lineHeight: '24px',
      borderRadius: '4px',
      margin: '4px',
      backgroundColor: 'rgba(0, 0, 0, .08)',
    },
    '& > .row .amount': {
      display: 'inline-block',
      whiteSpace: 'nowrap',
      textAlign: 'right',
      marginRight: '16px',
      width: '90px',
    },
    '& > .info': {
      color: 'rgba(0, 0, 0, .3)',
      fontSize: 'small',
    },
  },
  transactionsTable: {
    borderTop: '1px solid lightgrey',
  },
});
type ReportRenderNode = {
  reportNode: IReportNode,
  amountCents: number,
  transactions: ITransaction[],
  subcategories: ReportRenderNode[],
};

interface IDateOption {
  name: string;
  startDate: moment.Moment;
  endDate: moment.Moment;
  description: string;
}

interface IReportOwnProps extends WithStyles<typeof styles> {
}
interface IReportAppStateProps {
  reportCategories: IReportNode[];
  settingsCloudState: CloudState;
  transactions: ITransaction[];
}
interface IReportDispatchProps {
  fetchSettings: () => void;
  updateReportCategories: (categories: IReportNode[]) => void;
  saveSettings: () => void;
  fetchTransactions: () => void;
}
type IReportProps = IReportOwnProps & IReportAppStateProps & IReportDispatchProps;
interface IReportState {
  startDate: Date;
  endDate: Date;
  selectValue: string;
  categoriesPretty: string;
  isFilterDrawerOpen: boolean;
}
const Report = withStyles(styles)(
class extends React.Component<IReportProps, IReportState> {
  constructor(props: IReportProps, context?: any) {
    super(props, context);
    let startDate = moment().year(moment().year() - 1).month(0).date(1).toDate();
    let endDate = moment().year(moment().year() - 1).month(11).date(31).toDate();

    this.state = {
      startDate: startDate,
      endDate: endDate,
      selectValue: 'lastyear',
      categoriesPretty: this.props.reportCategories.length
          ? JSON.stringify(this.props.reportCategories, null, 2)
          : LOADING_TEXT,
      isFilterDrawerOpen: false,
    };
    this.props.fetchSettings();
    this.props.fetchTransactions();
  }

  public componentDidUpdate(prevProps: IReportProps): void {
    // Update the editable textarea once settings load.
    if (this.state.categoriesPretty == LOADING_TEXT && this.props.reportCategories) {
      this.setState({
        categoriesPretty: JSON.stringify(this.props.reportCategories, null, 2),
      });
    }
  }

  public render(): React.ReactElement<object> {
    let classes = this.props.classes;
    let filteredTransactions = TransactionUtils.filterTransactionsByDate(
        this.props.transactions, this.state.startDate, this.state.endDate);
    let [unmatchedTransactions, renderedTree] = this.buildTree(filteredTransactions);
    let rows = unmatchedTransactions.map(t => {
        return (
          <Transaction transaction={t} key={t.id}/>
        );
      });

    let dateOptions = this.getDateOptions();

    let drawerContents = <div className={classes.drawerContents}>
        <div>
          <FormControl>
            <InputLabel htmlFor='date-select'>Date Range</InputLabel>
            <Select
              value={this.state.selectValue}
              onChange={this.handleDateChange}
              inputProps={{
                id: 'date-select',
              }}
            >
              {dateOptions.map((dateOption) => (
                <MenuItem value={dateOption.name}>{dateOption.description}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className={classes.controls}>
          <TextField
            label='Start date'
            value={moment(this.state.startDate).format('YYYY-MM-DD')}
            disabled
          />
          <TextField
            label='End date'
            value={moment(this.state.endDate).format('YYYY-MM-DD')}
            style={{marginLeft: '24px'}}
            disabled
          />
        </div>
        <TextField
          className={classes.jsonCategoriesTextField}
          InputProps={{classes: {
            input: classes.jsonCategoriesInput,
          }}}
          label='categories'
          placeholder='e.g., {}'
          multiline
          variant='outlined'
          value={this.state.categoriesPretty}
          onChange={this.handleChangeReportJson}
        />
        <Button
            variant='contained'
            color='primary'
            className={classes.saveButton}
            disabled={this.props.settingsCloudState == CloudState.Done}
            onClick={this.props.saveSettings}>
          Save
        </Button>
      </div>;

    return (
      <div className={classes.root}>
        <ReportMenuBar
          cloudState={this.props.settingsCloudState}
          onFilterClick={() => this.setState({isFilterDrawerOpen: !this.state.isFilterDrawerOpen})}
        />

        <div className={classes.contentAndDrawerContainer}>
          <div className={classes.content}>
            <div className={classes.renderedTree}>
              {renderedTree}
            </div>
            <TransactionsTable classes={{root: classes.transactionsTable}}>
              {rows}
            </TransactionsTable>
          </div>
          <Hidden smUp>
            {/* Use a standard <Drawer> here for mobile. */}
            <Drawer
                anchor='right'
                classes={{paper: classes.drawerPaper}}
                open={this.state.isFilterDrawerOpen}
                onClose={() => this.setState({isFilterDrawerOpen: false})}>
              {drawerContents}
            </Drawer>
          </Hidden>
          <Hidden xsDown>
            <div className={classNames(classes.drawer, this.state.isFilterDrawerOpen && 'open')}>
              <div className={classes.drawerContentsContainer}>
                {drawerContents}
              </div>
            </div>
          </Hidden>
        </div>
      </div>
    );
  }

  public handleDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    let dateOptions = this.getDateOptions();
    for (let dateOption of dateOptions) {
      if (dateOption.name == event.target.value) {
        this.setState({
          startDate: dateOption.startDate.toDate(),
          endDate: dateOption.endDate.toDate(),
          selectValue: dateOption.name,
        });
        break;
      }
    }
  }

  public handleChangeReportJson = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    let categoriesPretty = event.target.value;
    let categories;
    try {
      categories = JSON.parse(categoriesPretty);
      this.props.updateReportCategories(categories);
    } catch (e) {
      // If there's a parse error, don't update categories.
    }
    this.setState({
      categoriesPretty: categoriesPretty,
    });
  }

  private getDateOptions = () => {
    let dateOptions: IDateOption[] = [];
    let startYear = 2018;  // TODO: Move this to settings.
    const lastDay = moment().subtract(1, 'day').startOf('day');
    // Year to date (2019)
    dateOptions.push({
      name: 'thisyear',
      startDate: lastDay.clone().month(0).date(1),
      endDate: lastDay,
      description: `Year to date (${lastDay.year()})`,
    });
    // Last year (2018)
    dateOptions.push({
      name: 'lastyear',
      startDate: lastDay.clone().subtract(1, 'year').month(0).date(1),
      endDate: lastDay.clone().subtract(1, 'year').month(11).date(31),
      description: `Last year (${lastDay.year() - 1})`,
    });
    // previous years
    for (let year = lastDay.year() - 2; year >= startYear; year--) {
      dateOptions.push({
        name: year.toString(),
        startDate: lastDay.clone().year(year).month(0).date(1),
        endDate: lastDay.clone().year(year).month(11).date(31),
        description: year.toString(),
      });
    }
    // Last month (Apr 2019)
    dateOptions.push({
      name: 'lastmonth',
      startDate: lastDay.clone().subtract(1, 'month').date(1),
      endDate: lastDay.clone().date(1).subtract(1, 'day'),
      description: `Last month (${lastDay.clone().subtract(1, 'month').format('MMM YYYY')})`,
    });
    // Month to date (May 2019)
    dateOptions.push({
      name: 'thismonth',
      startDate: lastDay.clone().date(1),
      endDate: lastDay.clone(),
      description: `Month to date (${lastDay.format('MMM YYYY')})`,
    });
    // Last 30 days
    dateOptions.push({
      name: 'last30',
      startDate: lastDay.clone().subtract(30, 'day'),
      endDate: lastDay.clone(),
      description: `Last 30 days`,
    });
    // Last week
    dateOptions.push({
      name: 'lastweek',
      startDate: lastDay.clone().day(-7),  // last Sunday
      endDate: lastDay.clone().day(-7).add(6, 'day'),
      description: `Last week (Sun - Sat)`,
    });
    // Last 7 days
    dateOptions.push({
      name: 'last7',
      startDate: lastDay.clone().subtract(7, 'day'),
      endDate: lastDay.clone(),
      description: `Last 7 days`,
    });
    // quarters
    for (let year = lastDay.year(); year >= startYear; year--) {
      for (let quarter = 3; quarter >= 0; quarter--) {
        let startMonth = quarter * 3;
        if (year == lastDay.year() && startMonth > lastDay.month()) {
          continue;
        }

        let endMonth = startMonth + 2;
        dateOptions.push({
          name: `${year}Q${quarter + 1}`,
          startDate: moment().year(year).month(startMonth).date(1),
          endDate: moment().year(year).month(endMonth + 1).date(1).subtract(1, 'day'),
          description: `${year} Q${quarter + 1}`,
        });
      }
    }
    // Last 90 days
    dateOptions.push({
      name: `last90`,
      startDate: lastDay.clone().subtract(90, 'day'),
      endDate: lastDay,
      description: `Last 90 days`,
    });

    return dateOptions;
  }

  // Builds the tree to be rendered.
  private buildTree = (transactions: ITransaction[]): [ITransaction[], JSX.Element] => {
    if (!this.props.reportCategories.length) {
      return [[], <div key='loading'>Loading...</div>];
    }

    let startTime = window.performance.now();
    let output: JSX.Element[] = [];
    const buildRenderTree = (reportNodes: IReportNode[]): ReportRenderNode[] => {
      reportNodes = reportNodes || [];
      let renderNodes: ReportRenderNode[] = [];
      for (let reportNode of reportNodes) {
        let reportRenderNode: ReportRenderNode = {
          reportNode: reportNode,
          amountCents: 0,
          transactions: [],
          subcategories: buildRenderTree(reportNode.subcategories),
        };
        renderNodes.push(reportRenderNode);
      }
      return renderNodes;
    };
    let ReportRenderNodes = buildRenderTree(this.props.reportCategories);

    let tagToRootReportRenderNode: Map<string, ReportRenderNode> = new Map();
    for (let renderNode of ReportRenderNodes) {
      if (!renderNode.reportNode.tags) {
        continue;
      }
      for (let tag of renderNode.reportNode.tags) {
        if (tagToRootReportRenderNode.has(tag)) {
          return [
              [],
              <div>Error, tag appears twice.
                {tag} in {tagToRootReportRenderNode.get(tag)!.reportNode.title}
                and {renderNode.reportNode.title}.
              </div>];
        }
        tagToRootReportRenderNode.set(tag, renderNode);
      }
    }

    const addTransactionToRenderNode = (transaction: ITransaction, node: ReportRenderNode): void => {
      node.transactions.push(transaction);
      node.amountCents += transaction.amount_cents;
      let subnodes = [];
      for (let subnode of node.subcategories) {
        if (!subnode.reportNode.tags) {
          continue;
        }
        for (let tag of subnode.reportNode.tags) {
          if (transaction.tags.indexOf(tag) != -1) {
            subnodes.push(subnode);
            break;
          }
        }
      }
      if (subnodes.length > 1) {
        output.push(<div key={transaction.id}>
            Multiple subnodes of {node.reportNode.title}: {transaction.description} ({transaction.tags.join(', ')})</div>);
      } else if (subnodes.length == 1) {
        addTransactionToRenderNode(transaction, subnodes[0]);
      }
    };

    let unmatchedTransactions: ITransaction[] = [];
    let multipleCategoriesTransactions: ITransaction[] = [];
    for (let transaction of transactions) {
      let renderNodes = [];
      for (let tag of transaction.tags) {
        let node = tagToRootReportRenderNode.get(tag);
        if (node && renderNodes.indexOf(node) == -1) {
          renderNodes.push(node);
        }
      }
      if (renderNodes.length == 0) {
        unmatchedTransactions.push(transaction);
      } else if (renderNodes.length > 1) {
        multipleCategoriesTransactions.push(transaction);
      } else {
        addTransactionToRenderNode(transaction, renderNodes[0]);
      }
    }

    // console.log(ReportRenderNodes);

    let buildTime = window.performance.now();
    const buildDom = (renderNodes: ReportRenderNode[], depth: number, outputDom: JSX.Element[]): void => {
      renderNodes.sort((lhs, rhs) => {
        if (lhs.amountCents == rhs.amountCents) {
          return 0;
        }
        return lhs.amountCents > rhs.amountCents ? -1 : 1;
      });
      for (let renderNode of renderNodes) {
        outputDom.push(
            <div
                key={`${renderNode.reportNode.title}-${renderNode.amountCents}`}
                className='row'
                style={{marginLeft: (depth * 32) + 'px'}}>
              <span className='amount'>${TransactionUtils.formatAmountNumber(renderNode.amountCents)}</span>
              {renderNode.reportNode.title} from {renderNode.transactions.length} transaction(s)
            </div>);
        buildDom(renderNode.subcategories, depth + 1, outputDom);
      }
    };
    buildDom(ReportRenderNodes, 0, output);

    let domTime = window.performance.now();
    return [
      unmatchedTransactions,
      <React.Fragment>
        {output}
        <div className='info'>Build time: {(buildTime - startTime).toFixed(2)}ms</div>
        <div className='info'>DOM time: {(domTime - buildTime).toFixed(2)}ms</div>
      </React.Fragment>];
  }
});

const mapStateToProps = (state: IAppState): IReportAppStateProps => ({
  reportCategories: state.settings.settings.reportCategories,
  settingsCloudState: state.settings.cloudState,
  transactions: state.transactions.transactions,
});
const mapDispatchToProps = (dispatch: ThunkDispatch<IAppState, null, any>): IReportDispatchProps => ({
  fetchSettings: () => {
    dispatch(fetchSettingsFromDropboxIfNeeded());
  },
  updateReportCategories: (categories) => {
    dispatch(updateSetting('reportCategories', categories));
  },
  saveSettings: () => {
    dispatch(saveSettingsToDropbox());
  },
  fetchTransactions: () => {
    dispatch(fetchTransactionsFromDropboxIfNeeded());
  },
});
export default connect(mapStateToProps, mapDispatchToProps)(Report);

export const getDefaultCategories = (): IReportNode[] => {
  let lookup = new Map<string, IReportNode>();
  TAG_TO_CATEGORY.forEach((category, tag) => {
    let categoryName = Category[category];
    let node = lookup.get(categoryName) || {title: categoryName, tags: [], subcategories: []};
    node.tags.push(tag);
    lookup.set(categoryName, node);
  });
  let categories: IReportNode[] = [];
  lookup.forEach(node => categories.push(node));
  return categories;
};
