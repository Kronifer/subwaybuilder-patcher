import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";

export default function MapList({ rows, removeMap }) {
  const [rowOpen, setRowOpen] = React.useState(false);
  const [cityCode, setCityCode] = React.useState("");
  return (
    <>
      <TableContainer component={Paper} sx={{ maxWidth: "50lvw" }}>
        <Table aria-label="Map List">
          <TableHead>
            <TableRow>
              <TableCell>Map Name</TableCell>
              <TableCell>Creator</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              return (
                <TableRow key={row.name}>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">{row.name}</Typography>
                  </TableCell>
                  <TableCell>{row.creator}</TableCell>
                  <TableCell>{row.version}</TableCell>
                  <TableCell>
                    <Button
                      color="error"
                      variant="contained"
                      onClick={() => {
                        setRowOpen(true);
                        setCityCode(row.code);
                      }}
                    >
                      <DeleteIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={rowOpen} onClose={() => setRowOpen(false)}>
        <DialogTitle>Delete Map</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this map? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRowOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              removeMap(cityCode);
              setRowOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
