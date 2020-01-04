import { Button, createStyles, FormControl, InputLabel, MenuItem, Select, TextField, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { CloudState, IReportNode } from '../Model';
import moment = require('moment');

const styles = (theme: Theme) => createStyles({
  drawerContents: {
    padding: '16px',
  },
  dateRangeContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    '& > div': {
      flex: '0 0 auto',
    },
  },
  controls: {
    display: 'flex',
    marginTop: '16px',
  },
  jsonCategoriesInput: {
    minHeight: '360px',
    maxHeight: '600px',
    overflow: 'auto !important',
  },
  jsonCategoriesTextField: {
    width: '100%',
    marginTop: '16px',
  },
  saveButton: {
    marginTop: '16px',
  },
});

export interface IDateRange {
  name: string;
  startDate: moment.Moment;
  endDate: moment.Moment;
}

interface IDateOption extends IDateRange {
  description: string;
}

interface IReportFilterDrawerProps extends WithStyles<typeof styles> {
  dateRange: IDateRange;
  compareDateRange?: IDateRange;
  settingsCloudState: CloudState;
  saveSettings: () => void;
  categoriesPretty: string;
  updateReportCategories: (categories: IReportNode[]) => void;
  setDate: (dateRange: IDateRange, compareDateRange?: IDateRange) => void;
  setCategoriesPretty: (categoriesPretty: string) => void;
}

interface IReportFilterDrawerState {
}

export const ReportFilterDrawer = withStyles(styles)(
class extends React.Component<IReportFilterDrawerProps, IReportFilterDrawerState> {

  private START_YEAR: number = 2018;  // TODO: Move this to settings.

  constructor(props: IReportFilterDrawerProps, context?: any) {
    super(props, context);
  }

  public render(): JSX.Element {
    let classes = this.props.classes;

    let dateOptions = this.getDateOptions();
    let compareDateOptions = this.getCompareDateOptions(
        this.props.dateRange.startDate, this.props.dateRange.endDate);

    return (
      <div className={classes.drawerContents}>
        <div className={classes.dateRangeContainer}>
          <FormControl>
            <InputLabel htmlFor='date-select'>Date Range</InputLabel>
            <Select
              value={this.props.dateRange.name}
              onChange={(event: React.ChangeEvent<any>) => this.handleDateChange(
                  event.target.value, this.props.compareDateRange && this.props.compareDateRange.name)}
              inputProps={{
                id: 'date-select',
              }}
            >
              {dateOptions.map((dateOption) => (
                <MenuItem key={dateOption.name} value={dateOption.name}>{dateOption.description}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel htmlFor='compare-date-select'>Compare To</InputLabel>
            <Select
              value={this.props.compareDateRange ? this.props.compareDateRange.name : ''}
              onChange={(event: React.ChangeEvent<any>) => this.handleDateChange(this.props.dateRange.name, event.target.value)}
              inputProps={{
                id: 'compare-date-select',
              }}
            >
              {compareDateOptions.map((dateOption) => (
                <MenuItem key={dateOption.name} value={dateOption.name}>{dateOption.description}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className={classes.controls}>
          <TextField
            label='Start date'
            value={moment(this.props.dateRange.startDate).format('YYYY-MM-DD')}
            disabled
          />
          <TextField
            label='End date'
            value={moment(this.props.dateRange.endDate).format('YYYY-MM-DD')}
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
  public handleDateChange = (name: string, compareName?: string) => {
    let dateOptions = this.getDateOptions();
    for (let dateOption of dateOptions) {
      if (dateOption.name == name) {
        let compareDateOption;
        if (compareName) {
          let compareDateOptions = this.getCompareDateOptions(
              dateOption.startDate, dateOption.endDate);
          for (let cDateOption of compareDateOptions) {
            if (cDateOption.name == compareName) {
              compareDateOption = cDateOption;
              break;
            }
          }
        }

        this.props.setDate(dateOption, compareDateOption);
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

  /**
   * Returns a list of options for the date selector.
   *
   * The names include 'thisyear', 'lastyear', 'YYYY', 'lastmonth',
   * 'thismonth', 'last30', 'lastweek', 'last7', 'YYYYQq', 'last90'.
   */
  private getDateOptions = () => {
    let dateOptions: IDateOption[] = [];
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
    for (let year = lastDay.year() - 2; year >= this.START_YEAR; year--) {
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
    for (let year = lastDay.year(); year >= this.START_YEAR; year--) {
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

  private getCompareDateOptions = (startDate: moment.Moment, endDate: moment.Moment) => {
    let dateOptions: IDateOption[] = [];
    const lastDay = moment().subtract(1, 'day').startOf('day');

    if (startDate.year() == endDate.year() && startDate.dayOfYear() == 1 &&
        endDate.clone().add(1, 'day').dayOfYear() == 1) {
      for (let year = lastDay.year() - 1; year >= this.START_YEAR; year--) {
        if (year == startDate.year()) {
          continue;
        }
        dateOptions.push({
          name: year.toString(),
          startDate: lastDay.clone().year(year).month(0).date(1),
          endDate: lastDay.clone().year(year).month(11).date(31),
          description: year.toString(),
        });
      }
    }

    return dateOptions;
  }

});

export default ReportFilterDrawer;
