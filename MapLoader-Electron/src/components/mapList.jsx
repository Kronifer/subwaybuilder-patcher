import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';

export default function MapList({rows}) {
    return (
        <TableContainer component={Paper} sx={{maxWidth: "50lvw"}}>
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
                    {rows.map((row) => (
                        <TableRow key={row.mapName}>
                            <TableCell component="th" scope="row">
                                <Typography variant="h6">{row.mapName}</Typography>
                            </TableCell>
                            <TableCell>{row.creator}</TableCell>
                            <TableCell>{row.version}</TableCell>
                            <TableCell>
                                <Button color="error" variant="contained"><DeleteIcon/></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}