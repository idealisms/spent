import { createStyles, WithStyles } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import { Theme, withStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import CallMergeIcon from '@material-ui/icons/CallMerge';
import CallSplitIcon from '@material-ui/icons/CallSplit';
import CloudDoneIcon from '@material-ui/icons/CloudDone';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import LabelIcon from '@material-ui/icons/Label';
import * as React from 'react';
import * as Transactions from '../../transactions';
import { CloudState } from '../Model';
import MenuBarWithDrawer from './MenuBarWithDrawer';

const styles = (theme: Theme) => createStyles({
  tooltip: {
    marginLeft: '36px',
  },
  whiteIconButton: {
    '& svg': {
      fill: '#fff',
      color: '#fff',
    },
  },
  appBar: {
  },
  appBarSelected: {
    backgroundColor: '#fff',
    color: 'rgba(0, 0, 0, .54)',
  },
});

interface IMenuBarProps extends WithStyles<typeof styles> {
  title: string;
  selectedTransactions?: Map<string, Transactions.ITransaction>;
  cloudState?: CloudState;
  onSaveClick?: () => void;
  onSelectedBackClick?: () => void;
  onSelectedEditSaveClick?: (transaction: Transactions.ITransaction) => void;
  onSelectedBatchEditTagsSaveClick?: (updatedTransactions: Transactions.ITransaction[]) => void;
  onSelectedMergeSaveClick?: (transaction: Transactions.ITransaction) => void;
  onSelectedDeleteClick?: (transactions: Map<string, Transactions.ITransaction>) => void;
  onSelectedSplitSaveClick?: (transactions: Map<string, Transactions.ITransaction>) => void;
}

interface IMenuBarState {
  isEditDialogOpen: boolean;
  isBatchEditTagsDialogOpen: boolean;
  isMergeDialogOpen: boolean;
  isSplitDialogOpen: boolean;
}

// TODO: Create new ReportMenuBar and rename this to EditorMenuBar.
const MenuBar = withStyles(styles)(
class extends React.Component<IMenuBarProps, IMenuBarState> {

  constructor(props: IMenuBarProps, context?: any) {
    super(props, context);
    this.state = {
      isEditDialogOpen: false,
      isBatchEditTagsDialogOpen: false,
      isMergeDialogOpen: false,
      isSplitDialogOpen: false,
    };
  }

  public render(): JSX.Element {
    let classes = this.props.classes;
    let selectedTransactionsArray = this.props.selectedTransactions ? [...this.props.selectedTransactions.values()] : [];

    let numSelectedTransactions = selectedTransactionsArray.length;
    let title = this.props.title;
    if (numSelectedTransactions === 1) {
      title = '1 item';
    } else if (numSelectedTransactions > 1) {
      title = numSelectedTransactions + ' items';
    }

    let iconElementLeft = numSelectedTransactions
        ? <IconButton onClick={() => {
              if (this.props.onSelectedBackClick) {
                this.props.onSelectedBackClick();
              }
          }}>
            <ArrowBackIcon />
          </IconButton>
        : undefined;

    let iconElementRight = numSelectedTransactions
        ? <span>
            <Tooltip classes={{tooltip: classes.tooltip}} title='Edit'><span><IconButton
                disabled={numSelectedTransactions > 1}
                onClick={this.handleShowEditDialog}
                ><EditIcon /></IconButton></span>
            </Tooltip>
            <Tooltip classes={{tooltip: classes.tooltip}} title='Batch Edit Tags'><span><IconButton
                disabled={numSelectedTransactions === 1}
                onClick={this.handleShowBatchEditTagsDialog}
                ><LabelIcon /></IconButton></span>
            </Tooltip>
            <Tooltip classes={{tooltip: classes.tooltip}} title='Merge'><span><IconButton
                disabled={numSelectedTransactions === 1}
                onClick={this.handleShowMergeDialog}
                ><CallMergeIcon /></IconButton></span>
            </Tooltip>
            <Tooltip classes={{tooltip: classes.tooltip}} title='Split'><span><IconButton
                disabled={numSelectedTransactions > 1}
                onClick={this.handleShowSplitDialog}
                ><CallSplitIcon /></IconButton></span>
            </Tooltip>
            <Tooltip title='Delete' placement='bottom-end'><IconButton
                onClick={() => this.props.onSelectedDeleteClick!(this.props.selectedTransactions!)}
                ><DeleteIcon /></IconButton>
            </Tooltip>
          </span>
        : (this.props.cloudState ?
            <span>
              <IconButton
                  className={classes.whiteIconButton}
                  disabled={this.props.cloudState != CloudState.Modified}
                  onClick={this.props.onSaveClick}>{
                this.props.cloudState == CloudState.Modified ? <CloudUploadIcon /> :
                    (this.props.cloudState == CloudState.Uploading
                        ? <CircularProgress size={24} thickness={4} />
                        : <CloudDoneIcon />)
              }</IconButton>
            </span> : undefined);

    return (
        <MenuBarWithDrawer
            classes={{appBar: numSelectedTransactions ? classes.appBarSelected
                                                      : classes.appBar}}
            title={title}
            iconElementLeft={iconElementLeft}
            iconElementRight={iconElementRight}
        >
          {this.state.isEditDialogOpen && this.props.onSelectedEditSaveClick ?
            <Transactions.EditTransactionDialog
                transaction={this.props.selectedTransactions!.values().next().value}
                onClose={() => this.setState({isEditDialogOpen: false})}
                onSaveChanges={this.props.onSelectedEditSaveClick}
            /> : undefined}
          {this.state.isBatchEditTagsDialogOpen && this.props.onSelectedBatchEditTagsSaveClick ?
            <Transactions.BatchEditTagsDialog
                transactions={selectedTransactionsArray}
                onClose={() => this.setState({isBatchEditTagsDialogOpen: false})}
                onSaveChanges={this.props.onSelectedBatchEditTagsSaveClick}
            /> : undefined}
          {this.state.isMergeDialogOpen && this.props.onSelectedMergeSaveClick ?
            <Transactions.MergeTransactionDialog
                transactions={selectedTransactionsArray}
                onClose={() => this.setState({isMergeDialogOpen: false})}
                onSaveChanges={this.props.onSelectedMergeSaveClick}
            /> : undefined}
          {this.state.isSplitDialogOpen && this.props.onSelectedSplitSaveClick ?
            <Transactions.SplitTransactionDialog
                transaction={this.props.selectedTransactions!.values().next().value}
                onClose={() => this.setState({isSplitDialogOpen: false})}
                onSaveChanges={this.props.onSelectedSplitSaveClick}
            /> : undefined}
        </MenuBarWithDrawer>
    );
  }

  private handleShowEditDialog = (): void => {
    if (!this.props.selectedTransactions || this.props.selectedTransactions.size != 1) {
      return;
    }
    this.setState({
      isEditDialogOpen: true,
    });
  }

  private handleShowBatchEditTagsDialog = (): void => {
    if (!this.props.selectedTransactions || this.props.selectedTransactions.size < 2) {
      return;
    }
    this.setState({
      isBatchEditTagsDialogOpen: true,
    });
  }

  private handleShowMergeDialog = (): void => {
    if (!this.props.selectedTransactions || this.props.selectedTransactions.size < 2) {
      return;
    }
    this.setState({
      isMergeDialogOpen: true,
    });
  }

  private handleShowSplitDialog = (): void => {
    if (!this.props.selectedTransactions || this.props.selectedTransactions.size != 1) {
      return;
    }
    this.setState({
      isSplitDialogOpen: true,
    });
  }
});

export default MenuBar;
