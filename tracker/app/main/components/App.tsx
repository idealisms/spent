import * as React from 'react';
import { Switch } from 'react-router';
import { Redirect, Route } from 'react-router-dom';
import Daily from './Daily';
import Editor from './Editor';
import Monthly from './Monthly';
import Report from './Report';
import * as Pages from './RoutePaths';

const NoMatch = () => (
  <h1 style={{color:'red'}}>Page not found!</h1>
);

export class App extends React.Component<object, object> {
  public render(): React.ReactElement<App> {

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
}

export default App;
