import AppBar from '@mui/material/AppBar';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { Theme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BarChartIcon from '@mui/icons-material/BarChart';
import CategoryIcon from '@mui/icons-material/Category';
import EditIcon from '@mui/icons-material/Edit';
import LabelIcon from '@mui/icons-material/Label';
import MenuIcon from '@mui/icons-material/Menu';
import TimelineIcon from '@mui/icons-material/Timeline';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Pages from './RoutePaths';

const useStyles = makeStyles()((_theme: Theme) => ({
  root: {
    flex: 'none',
  },
  grow: {
    flexGrow: 1,
  },
  whiteIconButton: {
    '& svg': {
      fill: '#fff',
      color: '#fff',
    },
  },
  appBar: {},
  drawerPaper: {
    width: '250px',
  },
  drawerHeader: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'green',
    color: '#fff',
  },
  drawerHeaderIcon: {
    fontSize: '24px',
    width: '48px',
  },
  drawerItemText: {
    fontWeight: 500,
  },
}));

interface IMenuBarWithDrawerOwnProps {
  title: string;
  /** If not provided, this is the hamburger menu. */
  iconElementLeft?: JSX.Element;
  iconElementRight?: JSX.Element;
  classes?: Partial<ReturnType<typeof useStyles>['classes']>;
}

interface IMenuBarWithDrawerInnerProps extends IMenuBarWithDrawerOwnProps {
  location: ReturnType<typeof useLocation>;
  navigateTo: ReturnType<typeof useNavigate>;
  internalClasses: ReturnType<typeof useStyles>['classes'];
}

interface IMenuBarWithDrawerState {
  isDrawerOpen: boolean;
}

class MenuBarWithDrawerInner extends React.Component<
  IMenuBarWithDrawerInnerProps,
  IMenuBarWithDrawerState
> {
  constructor(props: IMenuBarWithDrawerInnerProps) {
    super(props);
    this.state = {
      isDrawerOpen: false,
    };
  }

  public render(): JSX.Element {
    let classes = { ...this.props.internalClasses, ...this.props.classes };
    let selectedPage = this.props.location && this.props.location.pathname;
    return (
      <div className={classes.root}>
        <AppBar position="static" className={classes.appBar}>
          <Toolbar>
            {this.props.iconElementLeft ? (
              this.props.iconElementLeft
            ) : (
              <IconButton
                className={classes.whiteIconButton}
                onClick={() => {
                  this.handleToggle();
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" className={classes.grow} color="inherit">
              {this.props.title}
            </Typography>
            {this.props.iconElementRight}
          </Toolbar>
        </AppBar>

        <Drawer
          classes={{ paper: classes.drawerPaper }}
          open={this.state.isDrawerOpen}
          onClose={() => this.setState({ isDrawerOpen: false })}
        >
          <div className={classes.drawerHeader}>
            <div className={classes.drawerHeaderIcon}>📈</div>
            <Typography variant="h6" color="inherit">
              Spent
            </Typography>
          </div>
          <List>
            <ListItemButton
              key="Daily"
              onClick={() => this.handleNavigate(Pages.DailyPage)}
              selected={selectedPage === Pages.DailyPage}
            >
              <ListItemIcon>
                <TimelineIcon
                  color={
                    selectedPage === Pages.DailyPage ? 'primary' : 'inherit'
                  }
                />
              </ListItemIcon>
              <ListItemText
                classes={{ primary: classes.drawerItemText }}
                primary="Daily"
              />
            </ListItemButton>
            <ListItemButton
              key="Monthly"
              onClick={() => this.handleNavigate(Pages.MonthlyPage)}
              selected={selectedPage === Pages.MonthlyPage}
            >
              <ListItemIcon>
                <BarChartIcon
                  color={
                    selectedPage === Pages.MonthlyPage ? 'primary' : 'inherit'
                  }
                />
              </ListItemIcon>
              <ListItemText
                classes={{ primary: classes.drawerItemText }}
                primary="Monthly"
              />
            </ListItemButton>
            <ListItemButton
              key="Editor"
              onClick={() => this.handleNavigate(Pages.EditorPage)}
              selected={selectedPage === Pages.EditorPage}
            >
              <ListItemIcon>
                <EditIcon
                  color={
                    selectedPage === Pages.EditorPage ? 'primary' : 'inherit'
                  }
                />
              </ListItemIcon>
              <ListItemText
                classes={{ primary: classes.drawerItemText }}
                primary="Editor"
              />
            </ListItemButton>
            <ListItemButton
              key="Report"
              onClick={() => this.handleNavigate(Pages.ReportPage)}
              selected={selectedPage === Pages.ReportPage}
            >
              <ListItemIcon>
                <CategoryIcon
                  color={
                    selectedPage === Pages.ReportPage ? 'primary' : 'inherit'
                  }
                />
              </ListItemIcon>
              <ListItemText
                classes={{ primary: classes.drawerItemText }}
                primary="Report"
              />
            </ListItemButton>
            <ListItemButton
              key="Categories"
              onClick={() => this.handleNavigate(Pages.CategoriesPage)}
              selected={selectedPage === Pages.CategoriesPage}
            >
              <ListItemIcon>
                <LabelIcon
                  color={
                    selectedPage === Pages.CategoriesPage ? 'primary' : 'inherit'
                  }
                />
              </ListItemIcon>
              <ListItemText
                classes={{ primary: classes.drawerItemText }}
                primary="Categories"
              />
            </ListItemButton>
          </List>
        </Drawer>
      </div>
    );
  }

  private handleToggle = () => {
    this.setState({ isDrawerOpen: !this.state.isDrawerOpen });
  };

  private handleNavigate = (path: string) => {
    this.props.navigateTo(path);
    this.setState({ isDrawerOpen: false });
  };
}

export default function MenuBarWithDrawer(props: IMenuBarWithDrawerOwnProps) {
  const { classes: internalClasses } = useStyles();
  const location = useLocation();
  const navigateTo = useNavigate();
  return (
    <MenuBarWithDrawerInner
      {...props}
      internalClasses={internalClasses}
      location={location}
      navigateTo={navigateTo}
    />
  );
}
