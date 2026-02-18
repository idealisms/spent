import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { Theme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { CloudState, IReportNode } from '../model';
import moment = require('moment');

const useStyles = makeStyles()((_theme: Theme) => ({
  drawerContents: {
    padding: '16px',
  },
  dateRangeContainer: {
    display: 'flex',
  },
  dateSelect: {
    flex: '0 1 auto',
    width: '228px',
    marginRight: '16px',
  },
  compareDateSelect: {
    flex: '0 1 auto',
    width: '144px',
  },
  compareMenu: {
    '& li[data-value=""]': {
      color: 'rgba(0, 0, 0, .54)',
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
}));

export interface IDateRange {
  name: string;
  chartColumnName: string;
  startDate: moment.Moment;
  endDate: moment.Moment;
}

interface IDateOption extends IDateRange {
  description: string;
}

interface IReportFilterDrawerProps {
  dateRange: IDateRange;
  compareDateRange?: IDateRange;
  settingsCloudState: CloudState;
  saveSettings: () => void;
  categoriesPretty: string;
  reportNames: string[];
  selectedReportName: string;
  updateReportCategories: (categories: IReportNode[]) => void;
  setDate: (dateRange: IDateRange, compareDateRange?: IDateRange) => void;
  setCategoriesPretty: (categoriesPretty: string) => void;
}

interface IReportFilterDrawerState {}

interface IReportFilterDrawerInnerProps extends IReportFilterDrawerProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class ReportFilterDrawerInner extends React.Component<
  IReportFilterDrawerInnerProps,
  IReportFilterDrawerState
> {
  private readonly START_YEAR: number = 2018; // TODO: Move this to settings.

  constructor(props: IReportFilterDrawerInnerProps) {
    super(props);
  }

  public render(): JSX.Element {
    let startTime = window.performance.now();
    let classes = this.props.classes;

    // TODO: Memoize getDateOptions and getCompareDateOptions to improve
    // performance.
    let dateOptions = this.getDateOptions();
    let compareDateOptions = this.getCompareDateOptions(
      this.props.dateRange.startDate,
      this.props.dateRange.endDate
    );

    console.debug(
      `${window.performance.now() - startTime} ReportFilterDrawer render()`
    );
    return (
      <div className={classes.drawerContents}>
        <div className={classes.dateRangeContainer}>
          <FormControl className={classes.dateSelect}>
            <InputLabel htmlFor="date-select">Date Range</InputLabel>
            <Select
              value={this.props.dateRange.name}
              onChange={(event: any) =>
                this.handleDateChange(
                  event.target.value,
                  this.props.compareDateRange &&
                    this.props.compareDateRange.name
                )
              }
              inputProps={{
                id: 'date-select',
              }}
            >
              {dateOptions.map(dateOption => (
                <MenuItem key={dateOption.name} value={dateOption.name}>
                  {dateOption.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl className={classes.compareDateSelect}>
            <InputLabel htmlFor="compare-date-select">Compare To</InputLabel>
            <Select
              value={
                this.props.compareDateRange
                  ? this.props.compareDateRange.name
                  : ''
              }
              onChange={(event: any) =>
                this.handleDateChange(
                  this.props.dateRange.name,
                  event.target.value.trim()
                )
              }
              inputProps={{
                id: 'compare-date-select',
              }}
              MenuProps={{
                className: classes.compareMenu,
              }}
              disabled={!compareDateOptions.length}
            >
              {compareDateOptions.map(dateOption => (
                <MenuItem key={dateOption.name} value={dateOption.name}>
                  {dateOption.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div className={classes.controls}>
          <TextField
            label="Start date"
            value={moment(this.props.dateRange.startDate).format('YYYY-MM-DD')}
            disabled
          />
          <TextField
            label="End date"
            value={moment(this.props.dateRange.endDate).format('YYYY-MM-DD')}
            style={{ marginLeft: '24px' }}
            disabled
          />
        </div>
        <TextField
          className={classes.jsonCategoriesTextField}
          InputProps={{
            classes: {
              input: classes.jsonCategoriesInput,
            },
          }}
          label="categories"
          placeholder="e.g., {}"
          multiline
          variant="outlined"
          value={this.props.categoriesPretty}
          onChange={this.handleChangeReportJson}
        />
        <Button
          variant="contained"
          color="primary"
          className={classes.saveButton}
          disabled={this.props.settingsCloudState == CloudState.Done}
          onClick={this.props.saveSettings}
        >
          Save
        </Button>
      </div>
    );
  }
  public handleDateChange = (name: string, compareName?: string) => {
    let dateOptions = this.getDateOptions();
    for (let dateOption of dateOptions) {
      if (dateOption.name == name) {
        let compareDateOption;
        if (compareName) {
          let compareDateOptions = this.getCompareDateOptions(
            dateOption.startDate,
            dateOption.endDate
          );
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
  };

  public handleChangeReportJson = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    let categoriesPretty = event.target.value;
    let categories;
    try {
      categories = JSON.parse(categoriesPretty);
      this.props.updateReportCategories(categories);
    } catch {
      // If there's a parse error, don't update categories.
    }
    this.props.setCategoriesPretty(categoriesPretty);
  };

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
      chartColumnName: lastDay.format('YYYY'),
      startDate: lastDay.clone().month(0).date(1),
      endDate: lastDay,
      description: `Year to date (${lastDay.year()})`,
    });
    // Last year (2018)
    dateOptions.push({
      name: 'lastyear',
      chartColumnName: (lastDay.year() - 1).toString(),
      startDate: lastDay.clone().subtract(1, 'year').month(0).date(1),
      endDate: lastDay.clone().subtract(1, 'year').month(11).date(31),
      description: `Last year (${lastDay.year() - 1})`,
    });
    // previous years
    for (let year = lastDay.year() - 2; year >= this.START_YEAR; year--) {
      dateOptions.push({
        name: year.toString(),
        chartColumnName: year.toString(),
        startDate: lastDay.clone().year(year).month(0).date(1),
        endDate: lastDay.clone().year(year).month(11).date(31),
        description: year.toString(),
      });
    }
    // Last month (Apr 2019)
    dateOptions.push({
      name: 'lastmonth',
      chartColumnName: lastDay.clone().subtract(1, 'month').format('YYYY/MM'),
      startDate: lastDay.clone().subtract(1, 'month').date(1),
      endDate: lastDay.clone().date(1).subtract(1, 'day'),
      description: `Last month (${lastDay
        .clone()
        .subtract(1, 'month')
        .format('MMM YYYY')})`,
    });
    // Month to date (May 2019)
    dateOptions.push({
      name: 'thismonth',
      chartColumnName: lastDay.format('YYYY/MM'),
      startDate: lastDay.clone().date(1),
      endDate: lastDay.clone(),
      description: `Month to date (${lastDay.format('MMM YYYY')})`,
    });
    // Last 30 days
    dateOptions.push({
      name: 'last30',
      chartColumnName: `${lastDay
        .clone()
        .subtract(29, 'day')
        .format('MMM D')} to ${lastDay.format('MMM D')}`,
      startDate: lastDay.clone().subtract(29, 'day'),
      endDate: lastDay.clone(),
      description: 'Last 30 days',
    });
    // Last week
    const lastSunday = lastDay.clone().day(-7);
    dateOptions.push({
      name: 'lastweek',
      chartColumnName: `${lastSunday.format('MMM D')} to ${lastDay
        .clone()
        .add(6, 'day')
        .format('MMM D')}`,
      startDate: lastSunday,
      endDate: lastSunday.clone().add(6, 'day'),
      description: 'Last week (Sun - Sat)',
    });
    // Last 7 days
    dateOptions.push({
      name: 'last7',
      chartColumnName: `${lastDay
        .clone()
        .subtract(6, 'day')
        .format('MMM D')} to ${lastDay.format('MMM D')}`,
      startDate: lastDay.clone().subtract(6, 'day'),
      endDate: lastDay,
      description: 'Last 7 days',
    });
    // quarters
    for (let year = lastDay.year(); year >= this.START_YEAR; year--) {
      for (let quarter = 3; quarter >= 0; quarter--) {
        let startMonth = quarter * 3;
        let startDate = moment()
          .year(year)
          .month(startMonth)
          .date(1)
          .startOf('day');
        let endDate = startDate
          .clone()
          .month(startMonth + 3)
          .subtract(1, 'day');
        if (endDate.isAfter(lastDay)) {
          continue;
        }

        dateOptions.push({
          name: `${year}Q${quarter + 1}`,
          chartColumnName: `${year} Q${quarter + 1}`,
          startDate,
          endDate,
          description: `${year} Q${quarter + 1}`,
        });
      }
    }
    // Last 90 days
    dateOptions.push({
      name: 'last90',
      chartColumnName: `${lastDay
        .clone()
        .subtract(89, 'day')
        .format('MMM D')} to ${lastDay.format('MMM D')}`,
      startDate: lastDay.clone().subtract(89, 'day'),
      endDate: lastDay,
      description: 'Last 90 days',
    });

    return dateOptions;
  };

  /**
   * Returns a list of date options that we can compare against.
   * We can only do comparisons across years or quarters.
   */
  private getCompareDateOptions = (
    startDate: moment.Moment,
    endDate: moment.Moment
  ) => {
    let dateOptions: IDateOption[] = [];
    const lastDay = moment().subtract(1, 'day').startOf('day');

    if (
      startDate.year() == endDate.year() &&
      startDate.dayOfYear() == 1 &&
      endDate.clone().add(1, 'day').dayOfYear() == 1
    ) {
      // Create entries for full year comparisons.
      for (let year = lastDay.year() - 1; year >= this.START_YEAR; year--) {
        if (year == startDate.year()) {
          continue;
        }
        dateOptions.push({
          name: year.toString(),
          chartColumnName: year.toString(),
          startDate: lastDay.clone().year(year).month(0).date(1),
          endDate: lastDay.clone().year(year).month(11).date(31),
          description: year.toString(),
        });
      }
    } else if (
      startDate.year() == endDate.year() &&
      startDate.dayOfYear() == 1
    ) {
      // Comparing against year to date.
      for (let year = lastDay.year() - 1; year >= this.START_YEAR; year--) {
        if (year == startDate.year()) {
          continue;
        }
        dateOptions.push({
          name: year.toString() + '-to-date',
          chartColumnName: year.toString(),
          startDate: lastDay.clone().year(year).month(0).date(1),
          endDate: lastDay.clone().year(year).dayOfYear(endDate.dayOfYear()),
          description: year.toString() + ' to date',
        });
      }
    } else if (
      startDate.month() % 3 == 0 &&
      startDate.date() == 1 &&
      endDate.isSame(
        startDate.clone().add(3, 'month').subtract(1, 'day'),
        'day'
      )
    ) {
      // Create entries for quarter comparisons
      for (let year = lastDay.year(); year >= this.START_YEAR; year--) {
        for (let quarter = 3; quarter >= 0; quarter--) {
          let startMonth = quarter * 3;
          let compareStartDate = moment()
            .year(year)
            .month(startMonth)
            .date(1)
            .startOf('day');
          let compareEndDate = compareStartDate
            .clone()
            .month(startMonth + 3)
            .subtract(1, 'day');
          if (
            compareEndDate.isAfter(lastDay) ||
            compareEndDate.isSame(endDate, 'day')
          ) {
            continue;
          }

          dateOptions.push({
            name: `${year}Q${quarter + 1}`,
            chartColumnName: `${year} Q${quarter + 1}`,
            startDate: compareStartDate,
            endDate: compareEndDate,
            description: `${year} Q${quarter + 1}`,
          });
        }
      }
    }

    // Add a -none- option so the user can clear the comparison list.
    if (dateOptions.length) {
      dateOptions.unshift({
        name: '',
        chartColumnName: '',
        startDate: moment(),
        endDate: moment(),
        description: '-none-',
      });
    }

    return dateOptions;
  };
}

function ReportFilterDrawerWrapper(props: IReportFilterDrawerProps) {
  const { classes } = useStyles();
  return <ReportFilterDrawerInner {...props} classes={classes} />;
}

export { ReportFilterDrawerWrapper as ReportFilterDrawer };
export default ReportFilterDrawerWrapper;
