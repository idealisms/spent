import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Theme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';

const useStyles = makeStyles()((_theme: Theme) => ({
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
}));

interface IBaseNoNavProps {
  children?: React.ReactNode;
}

const BaseNoNav: React.FC<IBaseNoNavProps> = ({ children }) => {
  const { classes } = useStyles();

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
      <main className={classes.main}>{children}</main>
    </React.Fragment>
  );
};

export default BaseNoNav;
