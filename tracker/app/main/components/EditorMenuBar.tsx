import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { Theme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LabelIcon from '@mui/icons-material/Label';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import * as Transactions from '../../transactions';
import { CloudState } from '../model';
import MenuBarWithDrawer from './MenuBarWithDrawer';

const useStyles = makeStyles()((_theme: Theme) => ({
  tooltip: {
    marginLeft: '36px',
  },
  whiteIconButton: {
    '& svg': {
      fill: '#fff',
      color: '#fff',
    },
  },
  appBar: {},
  appBarSelected: {
    backgroundColor: '#fff',
    color: 'rgba(0, 0, 0, .54)',
  },
}));

interface IEditorMenuBarProps {
  title: string;
  selectedTransactions: Map<string, Transactions.ITransaction>;
  cloudState: CloudState;
  onSaveClick: () => void;
  onSelectedBackClick: () => void;
  onSelectedEditSaveClick: (transaction: Transactions.ITransaction) => void;
  onSelectedBatchEditTagsSaveClick: (
    updatedTransactions: Transactions.ITransaction[]
  ) => void;
  onSelectedMergeSaveClick: (transaction: Transactions.ITransaction) => void;
  onSelectedDeleteClick: (
    transactions: Map<string, Transactions.ITransaction>
  ) => void;
  onSelectedSplitSaveClick: (
    transactions: Map<string, Transactions.ITransaction>
  ) => void;
  onClassifyClick: () => void;
}

interface IEditorMenuBarState {
  isEditDialogOpen: boolean;
  isBatchEditTagsDialogOpen: boolean;
  isMergeDialogOpen: boolean;
  isSplitDialogOpen: boolean;
}

interface IEditorMenuBarInnerProps extends IEditorMenuBarProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class EditorMenuBarInner extends React.Component<
  IEditorMenuBarInnerProps,
  IEditorMenuBarState
> {
  constructor(props: IEditorMenuBarInnerProps) {
    super(props);
    this.state = {
      isEditDialogOpen: false,
      isBatchEditTagsDialogOpen: false,
      isMergeDialogOpen: false,
      isSplitDialogOpen: false,
    };
  }

  public render(): JSX.Element {
    let classes = this.props.classes;
    let selectedTransactionsArray = this.props.selectedTransactions
      ? [...this.props.selectedTransactions.values()]
      : [];

    let numSelectedTransactions = selectedTransactionsArray.length;
    let title = this.props.title;
    if (numSelectedTransactions === 1) {
      title = '1 item';
    } else if (numSelectedTransactions > 1) {
      title = numSelectedTransactions + ' items';
    }

    let iconElementLeft = numSelectedTransactions ? (
      <IconButton
        onClick={() => {
          if (this.props.onSelectedBackClick) {
            this.props.onSelectedBackClick();
          }
        }}
      >
        <ArrowBackIcon />
      </IconButton>
    ) : undefined;

    let iconElementRight = numSelectedTransactions ? (
      <span>
        <Tooltip classes={{ tooltip: classes.tooltip }} title="Edit">
          <span>
            <IconButton
              disabled={numSelectedTransactions > 1}
              onClick={this.handleShowEditDialog}
            >
              <EditIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip classes={{ tooltip: classes.tooltip }} title="Batch Edit Tags">
          <span>
            <IconButton
              disabled={numSelectedTransactions === 1}
              onClick={this.handleShowBatchEditTagsDialog}
            >
              <LabelIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip classes={{ tooltip: classes.tooltip }} title="Merge">
          <span>
            <IconButton
              disabled={numSelectedTransactions === 1}
              onClick={this.handleShowMergeDialog}
            >
              <CallMergeIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip classes={{ tooltip: classes.tooltip }} title="Split">
          <span>
            <IconButton
              disabled={numSelectedTransactions > 1}
              onClick={this.handleShowSplitDialog}
            >
              <CallSplitIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete" placement="bottom-end">
          <IconButton
            onClick={() => {
              if (
                this.props.onSelectedDeleteClick &&
                this.props.selectedTransactions
              ) {
                this.props.onSelectedDeleteClick(
                  this.props.selectedTransactions
                );
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </span>
    ) : (
      <span>
        <Tooltip title="Classify untagged">
          <IconButton
            className={classes.whiteIconButton}
            onClick={this.props.onClassifyClick}
          >
            <AutoFixHighIcon />
          </IconButton>
        </Tooltip>
        <IconButton
          className={classes.whiteIconButton}
          disabled={this.props.cloudState != CloudState.Modified}
          onClick={this.props.onSaveClick}
        >
          {this.props.cloudState == CloudState.Modified ? (
            <CloudUploadIcon />
          ) : this.props.cloudState == CloudState.Uploading ? (
            <CircularProgress size={24} thickness={4} />
          ) : (
            <CloudDoneIcon />
          )}
        </IconButton>
      </span>
    );

    return (
      <React.Fragment>
        <MenuBarWithDrawer
          classes={{
            appBar: numSelectedTransactions
              ? classes.appBarSelected
              : classes.appBar,
          }}
          title={title}
          iconElementLeft={iconElementLeft}
          iconElementRight={iconElementRight}
        />
        {this.state.isEditDialogOpen && this.props.selectedTransactions ? (
          <Transactions.EditTransactionDialog
            transaction={this.props.selectedTransactions.values().next().value!}
            onClose={() => this.setState({ isEditDialogOpen: false })}
            onSaveChanges={this.props.onSelectedEditSaveClick}
          />
        ) : undefined}
        {this.state.isBatchEditTagsDialogOpen ? (
          <Transactions.BatchEditTagsDialog
            transactions={selectedTransactionsArray}
            onClose={() => this.setState({ isBatchEditTagsDialogOpen: false })}
            onSaveChanges={this.props.onSelectedBatchEditTagsSaveClick}
          />
        ) : undefined}
        {this.state.isMergeDialogOpen ? (
          <Transactions.MergeTransactionDialog
            transactions={selectedTransactionsArray}
            onClose={() => this.setState({ isMergeDialogOpen: false })}
            onSaveChanges={this.props.onSelectedMergeSaveClick}
          />
        ) : undefined}
        {this.state.isSplitDialogOpen && this.props.selectedTransactions ? (
          <Transactions.SplitTransactionDialog
            transaction={this.props.selectedTransactions.values().next().value!}
            onClose={() => this.setState({ isSplitDialogOpen: false })}
            onSaveChanges={this.props.onSelectedSplitSaveClick}
          />
        ) : undefined}
      </React.Fragment>
    );
  }

  private handleShowEditDialog = (): void => {
    if (this.props.selectedTransactions.size != 1) {
      return;
    }
    this.setState({
      isEditDialogOpen: true,
    });
  };

  private handleShowBatchEditTagsDialog = (): void => {
    if (this.props.selectedTransactions.size < 2) {
      return;
    }
    this.setState({
      isBatchEditTagsDialogOpen: true,
    });
  };

  private handleShowMergeDialog = (): void => {
    if (this.props.selectedTransactions.size < 2) {
      return;
    }
    this.setState({
      isMergeDialogOpen: true,
    });
  };

  private handleShowSplitDialog = (): void => {
    if (this.props.selectedTransactions.size != 1) {
      return;
    }
    this.setState({
      isSplitDialogOpen: true,
    });
  };
}

function EditorMenuBarWrapper(props: IEditorMenuBarProps) {
  const { classes } = useStyles();
  return <EditorMenuBarInner {...props} classes={classes} />;
}

export default EditorMenuBarWrapper;
