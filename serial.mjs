/**
 * Serial communication module
 * This module provides functions to open, close, and write to a serial port.
 */
import {
    SerialPort
} from 'serialport';
import {
    InterByteTimeoutParser
} from '@serialport/parser-inter-byte-timeout';
import terminalKitPackage from 'terminal-kit';
import {
    RESPONSE_TYPE,
    RETURN_TYPE
} from './constants.mjs'; // Adjust the import path as necessary
const {
    terminal
} = terminalKitPackage;

// Yer.. just going to make this global for now
let port;

/**
 * Opens a serial port with the specified parameters.
 * Keep in mind that the port will take a moment to open, so you may want to wait for the 'open' event before proceeding.
 * @param {string} portName - The name of the serial port to open (default: '/dev/tty.usbserial-FTAKH8S5').
 * @param {number} baudRate - The baud rate for the serial communication (default: 9600).
 * @returns {Promise<void>} A promise that resolves when the port is opened successfully.
 */
const openSerialPort = async (portName = '/dev/tty.usbserial-FTAKH8S5', baudRate = 9600) => {


    try {
        // ...existing code...
        port = new SerialPort({
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

        port.on('open', () => {
            terminal(`Serial port ${port.path} opened successfully at ${baudRate} baud rate.\n`);
            handleSerialData(port); // Start handling data once the port is open
            sendWakeUp(); // Send a wake-up signal to the device
        });
        // Add signal listener
        port.on('signals', (signals) => {
            terminal(`Serial port signals changed:\n`);
            // CTS (Clear To Send), DSR (Data Set Ready), DCD (Data Carrier Detect), RI (Ring Indicator)
            // These signals are boolean values indicating the state of the respective signal.
            // You can use these signals to check the status of the serial port.
            // For example, you can check if the CTS signal is high (true) or low (false).
            // terminal(`CTS: ${signals.cts}, DSR: ${signals.dsr}, DCD: ${signals.dcd}, RI: ${signals.ri}\n`);
            // You can also use these signals to control the flow of data.
            // For example, you can use the CTS signal to control the flow of data.
            // If the CTS signal is low (false), you can stop sending data.
            // If the CTS signal is high (true), you can continue sending data.
            // This is useful for controlling the flow of data in a serial communication.
            terminal(`CTS: ${signals.cts}, DSR: ${signals.dsr}, DCD: ${signals.dcd}, RI: ${signals.ri}\n`);
        });

    } catch (error) {
        console.error(`Error opening serial port ${portName}:`, error);
        throw error; // Re-throw the error for further handling
    }
};


const isSerialPortOpen = () => {
    if (port) {
        return port.isOpen;
    } else {
        terminal(`Serial port is not initialized.\n`);
        return false;
    }
}

const closeSerialPort = () => {
    if (port && port.isOpen) {
        terminal(`Closing serial port ${port.path}...\n`);
        port.close((err) => {
            if (err) {
                console.error(`Error closing serial port:`, err);
            } else {
                terminal(`Serial port ${port.path} closed successfully.\n`);
            }
        });
    } else {
        terminal(`Serial port is not open or already closed.\n`);
    }

};

/**
 * Handles incoming serial data.
 * @param {*} port
 */
const handleSerialData = (port) => {

    const parser = port.pipe(new InterByteTimeoutParser({
        interval: 30
    }))
    // Listen for data events
    parser.on('data', (data) => {
        handleResponse(data);
        //console.log('Received:', data);
    });
}

/**
 * Writes data to the serial port.
 * @param {string} data - The data to write to the serial port.
 */
const writeToSerialPort = (data) => {
    if (port && port.isOpen) {
        port.write(data, (err) => {
            if (err) {
                console.error(`Error writing to serial port:`, err);
            } else {
                //terminal(`Data written to serial port: ${data}\n`);
            }
        });
    } else {
        terminal(`Serial port is not open. Cannot write data.\n`);
    }
}

/**
 * Sends a wake-up signal to the device. Sometimes it goes to sleep, so we need to wake it up.
 */
const sendWakeUp = () => {
    writeToSerialPort(driveStatusCommand());
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
const driveStatusCommand = () => {
    const preamble = Buffer.from([90, 90]); // 'ZZ'
    const requestType = Buffer.from([7]); // 07h for drive condition
    const length = Buffer.from([0]); // 00h (no data field)
    const checksum = Buffer.from([calculateChecksum(Buffer.concat([requestType, length]))]);
    return Buffer.concat([preamble, requestType, length, checksum]);
}

/**
 *   2   1  1  1        bytes
 * +----+--+--+------+
 * |5a5a|0C|00|chksum|
 * +----+--+--+------+
 *
 * Preamble - always 'ZZ'
 * request - type 0Ch
 * length - length of data 00h (no data field)
 * checksum - see below for calculating
 */
const driveConditionCommand = () => {
    const preamble = Buffer.from([90, 90]); // 'ZZ'
    const requestType = Buffer.from([12]); // 0Ch for drive condition
    const length = Buffer.from([0]); // 00h (no data field)
    const checksum = Buffer.from([calculateChecksum(Buffer.concat([requestType, length]))]);
    return Buffer.concat([preamble, requestType, length, checksum]);
}

const sendDriveCondition = () => {
    writeToSerialPort(driveConditionCommand());
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


const handleResponse = (bufferArray) => {
    // The response is a Buffer. We need to get the first byte to determine the type of response.

    // convert the buffer to an array of bytes
    const data = Array.from(bufferArray);
    console.log(data);

    if (data.length === 0) {
        //   terminal(`Received empty data.\n`);
        return;
    }
    const responseType = data[0];

    // Convert the response type to a hex string for better readability to match the protocol documentation
    const responseTypeHex = responseType.toString(16).toUpperCase().padStart(2, '0');
    console.log(`Response Type: ${responseTypeHex}`);

    switch (responseTypeHex) {
        case RETURN_TYPE.DRIVE_CONDITION: // DRIVE_CONDITION

            // terminal move to the end of the terminal
            terminal.moveTo(1, terminal.height);
            terminal.green(`Drive is healthy`);
            // Handle DRIVE_CONDITION response
            break;
        case 0x12: // OPEN_FILE, CLOSE_FILE, READ_FILE, WRITE_FILE, DELETE_FILE, FORMAT_DISK, DRIVE_STATUS, RENAME_FILE
            terminal(`Received response: ${RESPONSE_TYPE[responseTypeHex]}\n`);
            // Handle other responses as needed
            break;
        case 0x10: // READ_FILE_MORE
            terminal(`Received READ_FILE_MORE response.\n`);
            // Handle READ_FILE_MORE response
            break;
        default:
            terminal(`Unknown response type: ${responseType}\n`);
    }
}

export default {
    openSerialPort,
    isSerialPortOpen,
    closeSerialPort,
    sendWakeUp,
    sendDriveCondition,
}