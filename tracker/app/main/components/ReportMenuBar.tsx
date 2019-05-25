import { createStyles, WithStyles } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import { Theme, withStyles } from '@material-ui/core/styles';
import FilterListIcon from '@material-ui/icons/FilterList';
import * as React from 'react';
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
  onFilterClick: () => void;
}

interface IReportMenuBarState {
}

const ReportMenuBar = withStyles(styles)(
class extends React.Component<IReportMenuBarProps, IReportMenuBarState> {

  constructor(props: IReportMenuBarProps, context?: any) {
    super(props, context);
  }

  public render(): JSX.Element {
    let classes = this.props.classes;

    let iconElementRight = (
        <IconButton className={classes.whiteIconButton} onClick={this.props.onFilterClick}>
          <FilterListIcon />
        </IconButton>
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
