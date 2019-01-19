import green from '@material-ui/core/colors/green';
import purple from '@material-ui/core/colors/purple';
import red from '@material-ui/core/colors/red';
import { createMuiTheme, Theme } from '@material-ui/core/styles';
import { colors, getMuiTheme, MuiTheme, spacing } from 'material-ui/styles';
import { fade } from 'material-ui/utils/colorManipulator';

export const muiTheme: MuiTheme = getMuiTheme({
    spacing: spacing,
    fontFamily: 'Roboto, sans-serif',
    palette: {
        primary1Color: colors.green800,
        primary2Color: colors.green900,
        primary3Color: colors.green500,
        accent1Color: colors.grey700,
        accent2Color: colors.grey400,
        accent3Color: colors.grey800,
        textColor: colors.darkBlack,
        alternateTextColor: colors.white,
        canvasColor: colors.white,
        borderColor: colors.grey300,
        disabledColor: fade(colors.darkBlack, 0.3),
        pickerHeaderColor: colors.green800,
        clockCircleColor: fade(colors.darkBlack, 0.07),
        shadowColor: colors.fullBlack,
    },
});

export const theme: Theme = createMuiTheme({
    palette: {
        primary: {
            main: green['800'],
        },
        secondary: purple,
        error: red,
        // Used by `getContrastText()` to maximize the contrast between the background and
        // the text.
        contrastThreshold: 3,
        // Used to shift a color's luminance by approximately
        // two indexes within its tonal palette.
        // E.g., shift from Red 500 to Red 300 or Red 700.
        tonalOffset: 0.2,
      },
    typography: {
        useNextVariants: true,
    },
});
