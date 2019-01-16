import * as React from 'react';
import { Switch } from 'react-router';
import { Redirect, Route } from 'react-router-dom';
import Daily from './Daily';
import Editor from './Editor';
import Report from './Report';
import { DailyPage, EditorPage, HomePage, ReportPage } from './RoutePaths';

const NoMatch = () => (
  <h1 style={{color:'red'}}>Page not found!</h1>
);

export class App extends React.Component<object, object> {
  public render(): React.ReactElement<App> {

    return (
        <Switch>
          <Route exact path={HomePage}>
            <Redirect to={DailyPage} />
          </Route>
          <Route exact path={DailyPage} component={Daily} />
          <Route exact path={EditorPage} component={Editor} />
          <Route exact path={ReportPage} component={Report} />
          <Route component={NoMatch}/>
        </Switch>
      );
  }
}

export default App;
