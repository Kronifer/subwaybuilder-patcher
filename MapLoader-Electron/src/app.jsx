import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import MapList from './components/mapList.jsx';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

const root = createRoot(document);

function MainPage() {
    function onClose(event) {
        if(event.type === "click") {
           return; 
        }
        setShowFirstRunDialog(false);
        setShowCheckPathDialog(true);
    }

    let [firstRun, setFirstRun] = React.useState(window.localStorage.getItem('firstRun') === null ? true : false);
    let [showFirstRunDialog, setShowFirstRunDialog] = React.useState(firstRun);
    let [tempPath, setTempPath] = React.useState("");
    let [showCheckPathDialog, setShowCheckPathDialog] = React.useState(false);
    let [showModifyPathDialog, setShowModifyPathDialog] = React.useState(false);
    let [mapRows, setMapRows] = React.useState(JSON.parse(window.localStorage.getItem('mapRows')) || []);

    return (
        <React.Fragment>
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Dialog open={showFirstRunDialog} onClose={onClose}>
                <DialogTitle>Welcome to Map Loader!</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        It looks like this is your first time running Map Loader. Please select the folder where Subway Builder stores its App Data.
                    </DialogContentText>
                    <DialogContentText>
                        This is usually located at the following locations: <br/>
                    </DialogContentText>
                    <ul>
                        <li><Typography color="textSecondary">Windows: C:\Users\%username%\AppData\Roaming\metro-maker4</Typography></li>
                        <li><Typography color="textSecondary">macOS: /Users/%username%/Library/Application Support/metro-maker4</Typography></li>
                        <li><Typography color="textSecondary">Linux: /home/%username%/.local/share/metro-maker4</Typography></li>
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={() => {
                        let path = window.electron.openFolderDialog();
                        setTempPath(path);
                        onClose({type: "pathSelected"});
                    }}>Select</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={showCheckPathDialog} onClose={(e) => {if(e.type === "click"){return;}setShowCheckPathDialog(false)}}>
                <DialogTitle>Path Confirmation</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        You have selected the following path: <strong>{tempPath}</strong>. Is this correct?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" color="secondary" onClick={() => {
                        setTempPath(window.electron.openFolderDialog());
                    }}>No, Change</Button>
                    <Button variant="contained" color="primary" onClick={() => {
                        setShowCheckPathDialog(false);
                        setFirstRun(false);
                        window.localStorage.setItem('firstRun', 'false');
                        window.localStorage.setItem('appDataPath', tempPath);
                    }}>Yes</Button>
                </DialogActions>
            </Dialog>
            <Typography variant="h3" align="center" gutterBottom>
                Map Loader
            </Typography>
            <div style={{display: "flex", justifyContent: "center", marginBottom: "1rem", alignItems: "center", flexDirection: "row", gap: "1rem"}}>
                <Button variant="contained" color="info">Add a Map</Button>
                <Button variant="contained" color="success">Patch Game</Button>
            </div>
            <div style={{"alignItems": "center", "width": "100%", display: "flex", justifyContent: "center", flexDirection: "column"}}>
            <MapList rows={mapRows}/>
            {mapRows.length === 0 && (
                <Typography marginTop={1} variant="h6" color="textSecondary" align="center">
                    No maps found yet. Add some above!
                </Typography>
            )}
            </div>
        </ThemeProvider>
    </React.Fragment>
    )
}

root.render(
    <MainPage />
)