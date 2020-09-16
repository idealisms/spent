import { createStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { Switch } from 'react-router';
import { Route } from 'react-router-dom';
import Auth from './Auth';
import Daily from './Daily';
import Editor from './Editor';
import Login from './Login';
import Monthly from './Monthly';
import Report from './Report';
import * as Paths from './RoutePaths';

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
            <Route exact path={Paths.HomePage} component={Login} />
            <Route exact path={Paths.AuthPage} component={Auth} />
            <Route exact path={Paths.DailyPage} component={Daily} />
            <Route exact path={Paths.EditorPage} component={Editor} />
            <Route exact path={Paths.MonthlyPage} component={Monthly} />
            <Route exact path={Paths.ReportPage} component={Report} />
            <Route component={NoMatch} />
          </Switch>
        );
      }
    }
);

export default App;
