import IconButton from '@mui/material/IconButton';
import { Theme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import MenuBarWithDrawer from './MenuBarWithDrawer';

const useStyles = makeStyles()((_theme: Theme) => ({
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
}));

interface IReportMenuBarProps {
  onFilterClick: () => void;
}

interface IReportMenuBarState {}

interface IReportMenuBarInnerProps extends IReportMenuBarProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class ReportMenuBarInner extends React.Component<
  IReportMenuBarInnerProps,
  IReportMenuBarState
> {
  constructor(props: IReportMenuBarInnerProps) {
    super(props);
  }

  public render(): JSX.Element {
    let classes = this.props.classes;

    let iconElementRight = (
      <IconButton
        className={classes.whiteIconButton}
        onClick={this.props.onFilterClick}
      >
        <FilterListIcon />
      </IconButton>
    );

    return (
      <MenuBarWithDrawer
        title="Report"
        iconElementRight={iconElementRight}
        classes={{ root: classes.zIndexOne }}
      />
    );
  }
}

function ReportMenuBarWrapper(props: IReportMenuBarProps) {
  const { classes } = useStyles();
  return <ReportMenuBarInner {...props} classes={classes} />;
}

export default ReportMenuBarWrapper;
