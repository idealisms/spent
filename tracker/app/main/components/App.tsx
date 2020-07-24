import { createStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { Switch } from 'react-router';
import { Redirect, Route } from 'react-router-dom';
import Daily from './Daily';
import Editor from './Editor';
import Monthly from './Monthly';
import Report from './Report';
import * as Pages from './RoutePaths';

const styles = (theme: Theme) => createStyles({
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

const NoMatch = () => (
  <h1 style={{color:'red'}}>Page not found!</h1>
);

const App = withStyles(styles)(
    class extends React.Component<object, object> {
      public render(): React.ReactElement<object> {

        return (
          <Switch>
            <Route exact path={Pages.HomePage}>
              <Redirect to={Pages.DailyPage} />
            </Route>
            <Route exact path={Pages.DailyPage} component={Daily} />
            <Route exact path={Pages.EditorPage} component={Editor} />
            <Route exact path={Pages.MonthlyPage} component={Monthly} />
            <Route exact path={Pages.ReportPage} component={Report} />
            <Route component={NoMatch}/>
          </Switch>
        );
      }
    });

export default App;
