import { GlobalStyles } from '@mui/material';
import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthRoute from './AuthRoute';
import Auth from './Auth';
import Daily from './Daily';
import Editor from './Editor';
import Login from './Login';
import Monthly from './Monthly';
import Categories from './Categories';
import Report from './Report';
import * as RoutePaths from './RoutePaths';

const globalStyles = {
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
};

const NoMatch = () => <h1 style={{ color: 'red' }}>Page not found!</h1>;

const App: React.FC = () => {
  return (
    <>
      <GlobalStyles styles={globalStyles} />
      <Routes>
        <Route path={RoutePaths.HomePage} element={<Login />} />
        <Route path={RoutePaths.AuthPage} element={<Auth />} />
        <Route
          path={RoutePaths.DailyPage}
          element={
            <AuthRoute>
              <Daily />
            </AuthRoute>
          }
        />
        <Route
          path={RoutePaths.EditorPage}
          element={
            <AuthRoute>
              <Editor />
            </AuthRoute>
          }
        />
        <Route
          path={RoutePaths.MonthlyPage}
          element={
            <AuthRoute>
              <Monthly />
            </AuthRoute>
          }
        />
        <Route
          path={RoutePaths.ReportPage}
          element={
            <AuthRoute>
              <Report />
            </AuthRoute>
          }
        />
        <Route
          path={RoutePaths.CategoriesPage}
          element={
            <AuthRoute>
              <Categories />
            </AuthRoute>
          }
        />
        <Route path="*" element={<NoMatch />} />
      </Routes>
    </>
  );
};

export default App;
