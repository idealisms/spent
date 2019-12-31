import { Button, createStyles, FormControl, InputLabel, MenuItem, Select, TextField, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { CloudState, IReportNode } from '../Model';
import moment = require('moment');

const styles = (theme: Theme) => createStyles({
  drawerContents: {
    padding: '16px',
  },
  controls: {
    display: 'flex',
    marginTop: '16px',
  },
  jsonCategoriesInput: {
    minHeight: '360px',
    maxHeight: '600px',
  },
  jsonCategoriesTextField: {
    width: '100%',
    marginTop: '16px',
  },
  saveButton: {
    marginTop: '16px',
  },
});

interface IDateOption {
  name: string;
  startDate: moment.Moment;
  endDate: moment.Moment;
  description: string;
}

interface IReportFilterDrawerProps extends WithStyles<typeof styles> {
  startDate: Date;
  endDate: Date;
  selectValue: string;
  settingsCloudState: CloudState;
  saveSettings: () => void;
  categoriesPretty: string;
  updateReportCategories: (categories: IReportNode[]) => void;
  setDate: (startDate: Date, endDate: Date, selectValue: string) => void;
  setCategoriesPretty: (categoriesPretty: string) => void;
}

interface IReportFilterDrawerState {
}

const ReportFilterDrawer = withStyles(styles)(
class extends React.Component<IReportFilterDrawerProps, IReportFilterDrawerState> {

  constructor(props: IReportFilterDrawerProps, context?: any) {
    super(props, context);
  }

  public render(): JSX.Element {
    let classes = this.props.classes;

    let dateOptions = this.getDateOptions();

    return (
      <div className={classes.drawerContents}>
        <div>
          <FormControl>
            <InputLabel htmlFor='date-select'>Date Range</InputLabel>
            <Select
              value={this.props.selectValue}
              onChange={this.handleDateChange}
              inputProps={{
                id: 'date-select',
              }}
            >
              {dateOptions.map((dateOption) => (
                <MenuItem key={dateOption.name} value={dateOption.name}>{dateOption.description}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className={classes.controls}>
          <TextField
            label='Start date'
            value={moment(this.props.startDate).format('YYYY-MM-DD')}
            disabled
          />
          <TextField
            label='End date'
            value={moment(this.props.endDate).format('YYYY-MM-DD')}
            style={{marginLeft: '24px'}}
            disabled
          />
        </div>
        <TextField
          className={classes.jsonCategoriesTextField}
          InputProps={{classes: {
            input: classes.jsonCategoriesInput,
          }}}
          label='categories'
          placeholder='e.g., {}'
          multiline
          variant='outlined'
          value={this.props.categoriesPretty}
          onChange={this.handleChangeReportJson}
        />
        <Button
            variant='contained'
            color='primary'
            className={classes.saveButton}
            disabled={this.props.settingsCloudState == CloudState.Done}
            onClick={this.props.saveSettings}>
          Save
        </Button>
      </div>);
  }
  public handleDateChange = (event: React.ChangeEvent<any>) => {
    let dateOptions = this.getDateOptions();
    for (let dateOption of dateOptions) {
      if (dateOption.name == event.target.value) {
        this.props.setDate(
          dateOption.startDate.toDate(),
          dateOption.endDate.toDate(),
          dateOption.name,
        );
        break;
      }
    }
  }

  public handleChangeReportJson = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    let categoriesPretty = event.target.value;
    let categories;
    try {
      categories = JSON.parse(categoriesPretty);
      this.props.updateReportCategories(categories);
    } catch (e) {
      // If there's a parse error, don't update categories.
    }
    this.props.setCategoriesPretty(categoriesPretty);
  }

  private getDateOptions = () => {
    let dateOptions: IDateOption[] = [];
    let startYear = 2018;  // TODO: Move this to settings.
    const lastDay = moment().subtract(1, 'day').startOf('day');
    // Year to date (2019)
    dateOptions.push({
      name: 'thisyear',
      startDate: lastDay.clone().month(0).date(1),
      endDate: lastDay,
      description: `Year to date (${lastDay.year()})`,
    });
    // Last year (2018)
    dateOptions.push({
      name: 'lastyear',
      startDate: lastDay.clone().subtract(1, 'year').month(0).date(1),
      endDate: lastDay.clone().subtract(1, 'year').month(11).date(31),
      description: `Last year (${lastDay.year() - 1})`,
    });
    // previous years
    for (let year = lastDay.year() - 2; year >= startYear; year--) {
      dateOptions.push({
        name: year.toString(),
        startDate: lastDay.clone().year(year).month(0).date(1),
        endDate: lastDay.clone().year(year).month(11).date(31),
        description: year.toString(),
      });
    }
    // Last month (Apr 2019)
    dateOptions.push({
      name: 'lastmonth',
      startDate: lastDay.clone().subtract(1, 'month').date(1),
      endDate: lastDay.clone().date(1).subtract(1, 'day'),
      description: `Last month (${lastDay.clone().subtract(1, 'month').format('MMM YYYY')})`,
    });
    // Month to date (May 2019)
    dateOptions.push({
      name: 'thismonth',
      startDate: lastDay.clone().date(1),
      endDate: lastDay.clone(),
      description: `Month to date (${lastDay.format('MMM YYYY')})`,
    });
    // Last 30 days
    dateOptions.push({
      name: 'last30',
      startDate: lastDay.clone().subtract(30, 'day'),
      endDate: lastDay.clone(),
      description: `Last 30 days`,
    });
    // Last week
    dateOptions.push({
      name: 'lastweek',
      startDate: lastDay.clone().day(-7),  // last Sunday
      endDate: lastDay.clone().day(-7).add(6, 'day'),
      description: `Last week (Sun - Sat)`,
    });
    // Last 7 days
    dateOptions.push({
      name: 'last7',
      startDate: lastDay.clone().subtract(7, 'day'),
      endDate: lastDay.clone(),
      description: `Last 7 days`,
    });
    // quarters
    for (let year = lastDay.year(); year >= startYear; year--) {
      for (let quarter = 3; quarter >= 0; quarter--) {
        let startMonth = quarter * 3;
        if (year == lastDay.year() && startMonth > lastDay.month()) {
          continue;
        }

        let endMonth = startMonth + 2;
        dateOptions.push({
          name: `${year}Q${quarter + 1}`,
          startDate: moment().year(year).month(startMonth).date(1),
          endDate: moment().year(year).month(endMonth + 1).date(1).subtract(1, 'day'),
          description: `${year} Q${quarter + 1}`,
        });
      }
    }
    // Last 90 days
    dateOptions.push({
      name: `last90`,
      startDate: lastDay.clone().subtract(90, 'day'),
      endDate: lastDay,
      description: `Last 90 days`,
    });

    return dateOptions;
  }
});

export default ReportFilterDrawer;
