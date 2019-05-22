import { createStyles, WithStyles } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import { Theme, withStyles } from '@material-ui/core/styles';
import CloudDoneIcon from '@material-ui/icons/CloudDone';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import FilterListIcon from '@material-ui/icons/FilterList';
import * as React from 'react';
import { CloudState } from '../Model';
import MenuBarWithDrawer from './MenuBarWithDrawer';

const styles = (theme: Theme) => createStyles({
  // This is used to ensure that the appbar shadow is above the content.
  zIndexOne: {
    zIndex: 1,
  },
  whiteIconButton: {
    '& svg': {
      fill: '#fff',
      color: '#fff',
    },
  },
});

interface IReportMenuBarProps extends WithStyles<typeof styles> {
  cloudState: CloudState;
  onFilterClick: () => void;
  onSaveClick: () => void;
}

interface IReportMenuBarState {
}

const ReportMenuBar = withStyles(styles)(
class extends React.Component<IReportMenuBarProps, IReportMenuBarState> {

  constructor(props: IReportMenuBarProps, context?: any) {
    super(props, context);
    this.state = {
      isFilterDrawerOpen: false,
    };
  }

  public render(): JSX.Element {
    let classes = this.props.classes;

    let iconElementRight = (
        <span>
          <IconButton className={classes.whiteIconButton} onClick={this.props.onFilterClick}>
            <FilterListIcon />
          </IconButton>
          <IconButton
              className={classes.whiteIconButton}
              disabled={this.props.cloudState != CloudState.Modified}
              onClick={this.props.onSaveClick}>{
            this.props.cloudState == CloudState.Modified ? <CloudUploadIcon /> :
                (this.props.cloudState == CloudState.Uploading
                    ? <CircularProgress size={24} thickness={4} />
                    : <CloudDoneIcon />)
          }</IconButton>
      </span>
    );

    return (
        <MenuBarWithDrawer
            title='Report'
            iconElementRight={iconElementRight}
            classes={{root: classes.zIndexOne}}
        />
    );
  }
});

export default ReportMenuBar;
