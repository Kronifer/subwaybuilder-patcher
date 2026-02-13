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
import Modal from '@mui/material/Modal';

const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

const root = createRoot(document);

root.render(
    <React.Fragment>
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Modal open={window.localStorage.getItem("welcomeShown") !== "true"} onClose={() => window.localStorage.setItem("welcomeShown", "true")}>
                <div style={{position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#333", padding: "2rem", borderRadius: "8px"}}>
                    <Typography variant="h4" align="center" gutterBottom>
                        Welcome to Map Loader!
                    </Typography>
                    <Typography variant="body1" align="center">
                        This application allows you to manage your maps with ease. You can add, delete, and organize your maps all in one place. Get started by adding your first map!
                    </Typography>
                </div>
            </Modal>
            <Typography variant="h3" align="center" gutterBottom>
                Map Loader
            </Typography>
            <div style={{"alignItems": "center", "width": "100%", display: "flex", justifyContent: "center"}}>
            <MapList rows={[
                {mapName: 'Map 1', creator: 'Creator 1', version: '1.0'},
                {mapName: 'Map 2', creator: 'Creator 2', version: '1.0'},
                {mapName: 'Map 3', creator: 'Creator 3', version: '1.0'},
            ]} />
            </div>
        </ThemeProvider>
    </React.Fragment>
)