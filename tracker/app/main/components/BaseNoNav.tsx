import { createStyles, WithStyles } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';

const styles = (_theme: Theme) =>
  createStyles({
    appbar: {},
    main: {
      padding: '32px',
      margin: '0 auto',
      maxWidth: '800px',
    },
    spentIcon: {
      fontSize: '24px',
      width: '48px',
    },
  });

interface IBaseNoNavOwnProps extends WithStyles<typeof styles> {}

const BaseNoNav = withStyles(styles)(
  class Component extends React.Component<IBaseNoNavOwnProps, any> {
    public render(): React.ReactElement<Record<string, unknown>> {
      let classes = this.props.classes;

      return (
        <React.Fragment>
          <AppBar position="static" className={classes.appbar}>
            <Toolbar>
              <div className={classes.spentIcon}>📈</div>
              <Typography variant="h6" color="inherit">
                Spent
              </Typography>
            </Toolbar>
          </AppBar>
          <main className={classes.main}>{this.props.children}</main>
        </React.Fragment>
      );
    }
  }
);

export default BaseNoNav;
