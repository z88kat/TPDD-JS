/**
 * Using nodejs open a serial port and read data from it.
 * This example uses the 'serialport' library to open a serial port and read data from it.
 * Make sure to install the 'serialport' library using npm:
 * npm install serialport
 */
import terminalKitPackage from 'terminal-kit';
const {
    terminal
} = terminalKitPackage;
import colors from 'colors/safe.js'; // Use colors/safe.js for safe color usage
import serial from './serial.mjs';
import {
    SerialPort
} from 'serialport';
import {
    ReadlineParser
} from '@serialport/parser-readline';
import {
    InterByteTimeoutParser
} from '@serialport/parser-inter-byte-timeout';
// ls -la /dev/tty.usbserial*

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

const portName = '/dev/tty.usbserial-FTAKH8S5'; // Change this to your serial port name
let baudRate = 19200; // Change this to your baud rate

/*
// ...existing code...
const port = new SerialPort({
    path: portName,
    baudRate: baudRate,
    autoOpen: true,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    // flowControl rts: true, dtr: true
    rts: true, // Request to Send
    dtr: true // Data Terminal Ready
});
*/


// On the serial port send 4 times CR and then read data from it
//port.on('open', () => {
//  console.log(`Serial port ${portName} opened at ${baudRate} baud.`);

/*
    // Send 4 carriage returns (CR)
    for (let i = 0; i < 4; i++) {
        port.write('\r', (err) => {
            if (err) {
                return console.error('Error writing to port:', err.message);
            }
            console.log('Sent CR');
        });
    }

    // Wait 1 second before sending the DIR command
    setTimeout(() => {
        console.log('Sending DIR command...');
        sendDirCommand(); // Send the DIR command
    }, 1000);
*/
//});
/*
// Handle the 'close' event
port.on('close', () => {
    console.log(`Serial port ${portName} closed.`);
});


// Create a parser to read lines
const parser_line = port.pipe(new ReadlineParser({
    delimiter: '\r\n'
}));

const parser = port.pipe(new InterByteTimeoutParser({
    interval: 30
}))
// Listen for data events
parser.on('data', (data) => {
    console.log('Received:', data);
});

// Handle errors
port.on('error', (err) => {
    console.error('Error: ', err.message);
});
// ...existing code...

*/

const sendDirCommand = () => {
    const dir = 'DIR'; // Replace with the actual command you want to send
    // Send a command to the serial port
    port.write(dir + '\r', (err) => {
        if (err) {
            return console.error('Error writing to port:', err.message);
        }
        console.log(`Sent command: ${dir}`);
    });
}

// Read from the command line arguments
const args = process.argv.slice(2); // eslint-disable-line
if (args.length > 0) {
    const command = args[0].toUpperCase();
    if (command === 'DIR') {
        sendDirCommand();
    } else {
        console.log(`Unknown command: ${command}`);
    }
}

/**
 * The check sum is "the one's complement of the least significant byte of the number of bytes from the block format through the data block".
 * where bytes = the bytes including the Request Type, Length and all Data fields (but not including the preamble).
 * Checksum=(sum-of-bytes MOD 256) XOR 255
 */
const calculateChecksum = (bytes) => {
    const sum = bytes.reduce((acc, byte) => acc + byte, 0);
    const checksum = (sum % 256) ^ 255; // One's complement
    return checksum;
}

/**
 *     2   1  1  24             1           1           1      bytes
 *   +----+--+--+--------------+----------+------------+------+
 *   |5a5a|00|1a| filename     |attribute |search form |chksum|
 *   +----+--+--+--------------+----------+------------+------+
 *
 * Preamble - always 'ZZ'
 * request - type 00h*
 * length - length of data 1ah (26 decimal)
 * filename - padded with blanks
 * attribute - specify 'F' (not used normally)
 * search form
 *
 *  00h - reference file for open or delete
 *  01h - request first directory block
 *  02h - request next directory block
 *  03h - request previous directory block
 *  04h - end directory reference
 *
 * @param {number} request - The request type (0 for reference file, 1 for first directory block, etc.).
 * @param {string} filename - The name of the file to request directory information for.
 */
const directoryCommand = (search = 0, filename = '') => {
    const preamble = Buffer.from([90, 90]); // 'ZZ'
    const requestType = Buffer.from([0]); // 00h for reference file
    const length = Buffer.from([26]); // 1ah (26 decimal)
    const paddedFilename = Buffer.from(filename.padEnd(24, ' '), 'utf8'); // filename padded with blanks
    const attribute = Buffer.from([70]); // 'F' in ASCII
    const searchForm = Buffer.from([search]); // 01h for first directory block
    const checksum = Buffer.from([calculateChecksum(Buffer.concat([requestType, length, paddedFilename, attribute, searchForm]))]);
    return Buffer.concat([preamble, requestType, length, paddedFilename, attribute, searchForm, checksum]);
}

/**
 *  2   1  1  1        bytes<
 *  +----+--+--+------+
 *  |5a5a|07|00|chksum|
 *  +----+--+--+------+
 *
 * Preamble - always 'ZZ'
 * request - type 07h
 * length - length of data 00h (no data field)
 * checksum - see below for calculating
 */
const driveConditionCommand = () => {
    const preamble = Buffer.from([90, 90]); // 'ZZ'
    const requestType = Buffer.from([7]); // 07h for drive condition
    const length = Buffer.from([0]); // 00h (no data field)
    const checksum = Buffer.from([calculateChecksum(Buffer.concat([requestType, length]))]);
    return Buffer.concat([preamble, requestType, length, checksum]);
}


/**
 * Some commands must have the length and checksum calculate as the data is built
 */
const closeCommand = () => {
    // Close$   = "ZZ"+Chr$(2)+Chr$(0)+Chr$(253)
    return Buffer.from([90, 90, 2, 0, 253]);
}

const dir1Command = () => {
    // Dir1$    = "ZZ"+Chr$(0)+Chr$(26)+Space$(24)+"F"+Chr$(1)+Chr$(158)
    return Buffer.from([90, 90, 0, 26, ...Buffer.alloc(24, ' '), 70, 1, 158]);
}
const dir2Command = () => {
    // Dir2$    = "ZZ"+Chr$(0)+Chr$(26)+Space$(24)+"F"+Chr$(2)+Chr$(157)
    return Buffer.from([90, 90, 0, 26, ...Buffer.alloc(24, ' '), 70, 2, 157]);
}

/**
 *
 * <Buffer 5a 5a 07 00 f8>
 */
const statusCommand = () => {
    // Status$  = "ZZ"+Chr$(7)+Chr$(0)+Chr$(248)+Chr$(13)
    return Buffer.from([90, 90, 7, 0, 248, 13]);
    //return stringToHexArray('ZZ\x07\x00\xF8\x13'); // Using stringToHexArray for consistency
}

const formatCommand = () => {
    // "ZZ"+Chr$(6)+Chr$(0)+Chr$(249)+Chr$(13)
    return Buffer.from([90, 90, 6, 0, 249, 13]);
}

const eraseCommand = () => {
    // "ZZ"+Chr$(5)+Chr$(0)+Chr$(250)
    return Buffer.from([90, 90, 5, 0, 250]);
}


//
// Convert a string to an array of hex values
//
const stringToHexArray = (string) => {
    let array = [];
    for (let i = 0; i < string.length; i++) {
        array.push(charToHex(string[i]));
    }
    return array;
}

//
// Converts a character to a hex value
//
const charToHex = (char) => {
    return Number('0x' + char.charCodeAt(0).toString(16));
}


/**
 * Send the directory command to the serial port and read the response.
 * @param {string} filename - The name of the file to request directory information for.
 */
const sendDirectoryCommand = (request, filename) => {
    const command = directoryCommand(request, filename);
    port.write(command, (err) => {
        if (err) {
            return console.error('Error writing to port:', err.message);
        }
        console.log(`Sent directory command for file: ${filename}`);
    });
}
// Example usage
//sendDirectoryCommand(''); // Replace with the actual filename you want to request
//
/*
setTimeout(() => {
    console.log('Sending status command...', driveConditionCommand());
    let command = directoryCommand(); // Send the first directory command
    port.write(command, (err, data) => {
        if (err) {
            return console.error('Error writing to port:', err.message);
        }
        if (data) {
            console.log('Data written:', data);
        }
        console.log(`Sent command`);
    });
}, 3000); // Wait 3 seconds before sending the command
*/

/**
 * Create a new terminal-kit menubar with the specified options
 */
const createSingleLineMenu = () => {
    terminal.clear();
    terminal.hideCursor();
    terminal.moveTo(1, 1);
    terminal(`Welcome to the TPDD Base Protocol Terminal\n`);
    terminal(`Press 'c' to connect, 'd' to disconnect, or 'q' to quit.\n`);

    // Create a single line menu
    terminal.singleLineMenu(['Connect', 'Exit'], (error, response) => {
        if (error) {
            console.error('Error creating menu:', error);
            return;
        }
        console.log(`You selected: ${response.selectedText}`);
        // Handle menu selection here
        if (response.selectedText === 'Connect') {
            // Handle connect to serial port
            serial.openSerialPort(portName, baudRate)
        } else if (response.selectedText === 'Exit') {
            // Handle Help menu
        }
    });
    terminal.on('key', (name) => {
        if (name === 'q') {
            terminal.clear();
            terminal.hideCursor(false);
            terminal(`Exiting...\n`);
            serial.closeSerialPort();
            process.exit(0); // eslint-disable-line
        }
        if (name === 'c') {
            // Handle connect key
            serial.openSerialPort(portName, baudRate);
        }
        if (name === 'd') {
            // Handle disconnect key
            serial.closeSerialPort();
        }
        // drive status
        if (name === 's') {
            // Handle status key
            serial.sendDriveCondition();
        }
    });
    terminal.on('resize', () => {
        terminal.clear();
        terminal.moveTo(1, 1);
        terminal(`Welcome to the TPDD Base Protocol Terminal\n`);
        terminal(`Press 'q' to quit.\n`);
        createSingleLineMenu(); // Recreate the menu on resize
    });
    terminal.on('mouse', (name, data) => {
        if (name === 'MOUSE_LEFT_BUTTON_PRESSED') {
            console.log(`Mouse clicked at: ${data.x}, ${data.y}`);
            // Handle mouse click
        }
    });
    terminal.on('mouseWheel', (name, data) => {
        console.log(`Mouse wheel scrolled: ${data.direction}`);
        // Handle mouse wheel scroll
    });
    terminal.on('key', (name) => {
        if (name === 'CTRL_C') {
            terminal.clear();
            terminal.hideCursor(false);
            terminal(`Exiting...\n`);
            process.exit(0); // eslint-disable-line
        }
    });
}

const start = async () => {
    terminal.clear();
    terminal(`Starting serial port communication on ${portName} at ${baudRate} baud...\n`);
    console.log(colors.silly(`Starting serial port communication on ${portName} at ${baudRate} baud...`));


    // Create a new terminal-kit menubar with the specified options
    createSingleLineMenu();

    // Move to center of the terminal
    terminal.moveTo(1, 10);

    let ports = await SerialPort.list();

    // display a list of available serial ports
    terminal.green('Available Serial Ports:\n');
    ports.forEach((port) => {
        terminal.green(`Port: ${port.path}, Manufacturer: ${port.manufacturer || 'N/A'}, Serial Number: ${port.serialNumber || 'N/A'}\n`);
    });

};


start().catch((err) => {
    console.error('Error in start function:', err);
});