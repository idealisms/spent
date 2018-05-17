
import * as React from 'react';
import { Switch } from 'react-router';
import { Route } from 'react-router-dom';
import { CounterList } from '../../counterlist';
import Categories from './Categories';
import Daily from './Daily';
import Home from './Home';
import { CategoriesPage, CounterListPage, DailyPage, HomePage } from './RoutePaths';

const NoMatch = () => (
  <h1 style={{color:'red'}}>Page not found!</h1>
);

export class App extends React.Component<object, object> {
  public render(): React.ReactElement<App> {

    // {/* <MenuBar title='Title'/> */}
    return (
        <Switch>
          <Route exact path={HomePage} component={Home} />
          <Route exact path={DailyPage} component={Daily} />
          <Route exact path={CategoriesPage} component={Categories} />
          <Route exact path={CounterListPage} component={CounterList} />
          <Route component={NoMatch}/>
        </Switch>
      );
  }
}

export default App;
