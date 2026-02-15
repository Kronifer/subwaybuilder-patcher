import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import * as React from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import MapList from "./components/mapList.jsx";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import SnackbarContent from "@mui/material/SnackbarContent";
import CircularProgress from "@mui/material/CircularProgress";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const root = createRoot(document);

function MainPage() {
  function onClose(event) {
    if (event.type === "click") {
      return;
    }
    setShowFirstRunDialog(false);
    setShowCheckPathDialog(true);
  }

  async function handleAddMap() {
    let appDataPath = window.localStorage.getItem("appDataPath");
    setShowLoadingMapDialog(true);
    let result = await window.electron.importNewMap(
      appDataPath,
      mapRows.map((r) => r.code),
    );
    setShowLoadingMapDialog(false);
    console.log(result);
    if (result.status === "success") {
      let newMapRows = [...mapRows];
      newMapRows.push(result.config);
      setMapRows(newMapRows);
      window.localStorage.setItem("mapRows", JSON.stringify(newMapRows));
    }
    setTimeout(() => {
      spawnSnackbar(result.message, 3000);
    }, 200);
  }

  function removeMap(mapCode) {
    console.log(mapCode);
    let appDataPath = window.localStorage.getItem("appDataPath");
    let result = window.electron.deleteMap(mapCode, appDataPath);
    if (result.status === "success") {
      let newMapRows = mapRows.filter((r) => r.code !== mapCode);
      setMapRows(newMapRows);
      window.localStorage.setItem("mapRows", JSON.stringify(newMapRows));
    }
    spawnSnackbar(result.message, 3000);
  }

  function handleGenerateMod() {
    let appDataPath = window.localStorage.getItem("appDataPath");
    let result = window.electron.generateMod(mapRows, appDataPath);
    spawnSnackbar(result.message, 3000);
  }

  function handleStartGame() {
    let gameExecPath = window.localStorage.getItem("gameExecPath");
    let result = window.electron.startGame(gameExecPath);
    spawnSnackbar(result.message, 3000);
  }

  let [firstRun, setFirstRun] = React.useState(
    window.localStorage.getItem("firstRun") === null ? true : false,
  );
  let [showFirstRunDialog, setShowFirstRunDialog] = React.useState(firstRun);
  let [tempPath, setTempPath] = React.useState("");
  let [showCheckPathDialog, setShowCheckPathDialog] = React.useState(false);
  let [showLoadingMapDialog, setShowLoadingMapDialog] = React.useState(false);
  let [mapRows, setMapRows] = React.useState(
    JSON.parse(window.localStorage.getItem("mapRows")) || [],
  );
  let [showSnackbar, setShowSnackbar] = React.useState(false);
  let [snackbarMessage, setSnackbarMessage] = React.useState("");
  let [snackbarCloseTime, setSnackbarCloseTime] = React.useState(3000);
  let [showSelectGameExecPathDialog, setShowSelectGameExecPathDialog] =
    React.useState(false);
  let [showConfirmGameExecPathDialog, setShowConfirmGameExecPathDialog] =
    React.useState(false);

  function spawnSnackbar(message, duration) {
    setSnackbarMessage(message);
    setSnackbarCloseTime(duration);
    setShowSnackbar(true);
  }

  return (
    <React.Fragment>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Dialog open={showFirstRunDialog} onClose={onClose}>
          <DialogTitle>Welcome to the Subway Builder Map Manager!</DialogTitle>
          <DialogContent>
            <DialogContentText>
              It looks like this is your first time running the Subway Builder
              Map Manager. Please select the folder where Subway Builder stores
              its App Data.
            </DialogContentText>
            <DialogContentText>
              This is usually located at the following locations: <br />
            </DialogContentText>
            <ul>
              <li>
                <Typography color="textSecondary">
                  Windows: C:\Users\%username%\AppData\Roaming\metro-maker4
                </Typography>
              </li>
              <li>
                <Typography color="textSecondary">
                  macOS: /Users/%username%/Library/Application
                  Support/metro-maker4
                </Typography>
              </li>
              <li>
                <Typography color="textSecondary">
                  Linux: /home/%username%/.local/share/metro-maker4
                </Typography>
              </li>
            </ul>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                let path = window.electron.openFolderDialog();
                setTempPath(path);
                onClose({ type: "pathSelected" });
              }}
            >
              Select
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={showCheckPathDialog}
          onClose={(e) => {
            if (e.type === "click") {
              return;
            }
            setShowCheckPathDialog(false);
          }}
        >
          <DialogTitle>Path Confirmation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You have selected the following path: <strong>{tempPath}</strong>.
              Is this correct?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setTempPath(window.electron.openFolderDialog());
              }}
            >
              No, Change
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setShowCheckPathDialog(false);
                setFirstRun(false);
                setShowSelectGameExecPathDialog(true);
                window.localStorage.setItem("firstRun", "false");
                window.localStorage.setItem("appDataPath", tempPath);
              }}
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={showSelectGameExecPathDialog}
          onClose={(e) => {
            if (e.type === "click") {
              return;
            }
            setShowSelectGameExecPathDialog(false);
          }}
        >
          <DialogTitle>Select Game Executable</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please select the Subway Builder game executable, located wherever
              you installed the game to.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                let path = window.electron.openFileDialog();
                setTempPath(path);
                setShowSelectGameExecPathDialog(false);
                setShowConfirmGameExecPathDialog(true);
              }}
            >
              Select
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={showConfirmGameExecPathDialog}
          onClose={(e) => {
            if (e.type === "click") {
              return;
            }
            setShowConfirmGameExecPathDialog(false);
          }}
        >
          <DialogTitle>Path Confirmation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You have selected the following path: <strong>{tempPath}</strong>.
              Is this correct?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setTempPath(window.electron.openFolderDialog());
              }}
            >
              No, Change
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setShowConfirmGameExecPathDialog(false);
                setShowSelectGameExecPathDialog(false);
                window.localStorage.setItem("gameExecPath", tempPath);
              }}
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={showLoadingMapDialog}
          onClose={(e) => {
            if (e.type === "click") {
              return;
            }
            setShowLoadingMapDialog(false);
          }}
        >
          <DialogContent>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <CircularProgress size="3rem" />
            </div>
            <DialogContentText>
              <Typography variant="subtitle1">Importing Map...</Typography>
            </DialogContentText>
          </DialogContent>
        </Dialog>
        <Typography variant="h3" align="center" gutterBottom>
          Map Manager
        </Typography>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem",
            alignItems: "center",
            flexDirection: "row",
            gap: "1rem",
          }}
        >
          <Button variant="contained" color="info" onClick={handleAddMap}>
            Add a Map
          </Button>
          <Button variant="contained" color="info" onClick={handleGenerateMod}>
            Generate Mod
          </Button>
          <Button variant="contained" color="info" onClick={handleStartGame}>
            Start Game
          </Button>
        </div>
        <div
          style={{
            alignItems: "center",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <MapList rows={mapRows} removeMap={removeMap} />
          {mapRows.length === 0 && (
            <Typography
              marginTop={1}
              variant="h6"
              color="textSecondary"
              align="center"
            >
              No maps found yet. Add some above!
            </Typography>
          )}
        </div>
        <Snackbar
          open={showSnackbar}
          autoHideDuration={snackbarCloseTime}
          onClose={() => {
            setShowSnackbar(false);
          }}
        >
          <SnackbarContent message={snackbarMessage} />
        </Snackbar>
      </ThemeProvider>
    </React.Fragment>
  );
}

root.render(<MainPage />);
