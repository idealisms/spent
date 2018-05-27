
import { MuiTheme, colors, getMuiTheme, spacing } from 'material-ui/styles';
import { fade } from 'material-ui/utils/colorManipulator';

const muiTheme:MuiTheme = getMuiTheme({
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

export default muiTheme;
