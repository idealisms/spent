import { createStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { Switch } from 'react-router';
import { Route } from 'react-router-dom';
import AuthRoute from './AuthRoute';
import Auth from './Auth';
import Daily from './Daily';
import Editor from './Editor';
import Login from './Login';
import Monthly from './Monthly';
import Report from './Report';
import * as RoutePaths from './RoutePaths';

const styles = (_theme: Theme) =>
  createStyles({
    '@global': {
      html: {
        height: '100%',
      },
      body: {
        height: '100%',
        margin: 0,
      },
      '#app': {
        height: '100%',
      },
    },
  });

const NoMatch = () => <h1 style={{ color: 'red' }}>Page not found!</h1>;

const App = withStyles(styles)(
    class Component extends React.Component<
    Record<string, unknown>,
    Record<string, unknown>
    > {
      public render(): React.ReactElement<Record<string, unknown>> {
        return (
          <Switch>
            <Route exact path={RoutePaths.HomePage} component={Login} />
            <Route exact path={RoutePaths.AuthPage} component={Auth} />
            <AuthRoute exact path={RoutePaths.DailyPage} component={Daily} />
            <AuthRoute exact path={RoutePaths.EditorPage} component={Editor} />
            <AuthRoute exact path={RoutePaths.MonthlyPage} component={Monthly} />
            <AuthRoute exact path={RoutePaths.ReportPage} component={Report} />
            <Route component={NoMatch} />
          </Switch>
        );
      }
    }
);

export default App;
