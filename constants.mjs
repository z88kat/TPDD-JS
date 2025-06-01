/**
 * Standard constants for the TPDD Base Protocol.
 *
 * https://www.bitchin100.com/wiki/index.php?title=TPDD_Base_Protocol
 */


// ###############################################################################
//  "Operation Mode" constants
// ###############################################################################


// Operation Mode Request/Return Block Formats
const REQUEST_TYPE = {
    // Requests Format
    DIRECTORY: '00',
    OPEN_FILE: '01',
    CLOSE_FILE: '02',
    READ_FILE: '03',
    WRITE_FILE: '04',
    DELETE_FILE: '05',
    FORMAT_DISK: '06',
    DRIVE_STATUS: '07',
    DRIVE_CONDITION: '0C',
    RENAME_FILE: '0D'
}

const RETURN_TYPE = {
    // Responses Format
    DIRECTORY_MORE: '11',
    DIRECTORY: '12', //  --12 when finished reading
    OPEN_FILE: '12',
    CLOSE_FILE: '12',
    READ_FILE_MORE: '10', // --12 when finished reading
    READ_FILE: '12',
    WRITE_FILE: '12',
    DELETE_FILE: '12',
    FORMAT_DISK: '12',
    DRIVE_STATUS: '12',
    DRIVE_CONDITION: '15',
    RENAME_FILE: '12'
}

const RESPONSE_TYPE = {
    0x12: 'OPEN_FILE',
    0x15: 'DRIVE_CONDITION',
}

/*
 * Error Codes
 * These are used to indicate the status of operations.
 * The codes are defined in the TPDD Base Protocol documentation.
 *
 *  1  1  1      1      bytes
 *  +--+--+-----+-----+
 * |12|01|error|cksum|
 * +--+--+-----+-----+
 */
const ERROR_CODE = {
    // Error Codes
    NO_ERROR: '00',
    FILE_NOT_FOUND: '10',
    FILE_EXISTS: '11',
    NO_FILENAME: '30',
    DIRECTORY_SEARCH_ERROR: '31',
    BANK_ERROR: '35',
    PARAMETER_ERROR: '36',
    OPEN_FORMAT_MISMATCH: '37',
    END_OF_FILE: '3f',
    NO_START_MARK: '40',
    CRC_CHECK_ERROR_IN_ID: '41',
    SECTOR_LENGTH_ERROR: '42',
    FORMAT_VERIFY_ERROR: '44',
    FORMAT_INTERUPPTION: '46',
    ERASE_OFFSET_ERROR: '47',
    CRC_CHECK_ERROR_IN_DATA: '49',
    SECTOR_NUMBER_ERROR: '4a',
    READ_DATA_TIMEOUT: '4b',
    SECTOR_NUMBER_ERROR_2: '4d',
    DISK_WRITE_PROTECT: '50',
    UNINITIALIZED_DISK: '5e',
    DIRECTORY_FULL: '60',
    DISK_FULL: '61',
    FILE_TOO_LONG: '6e',
    NO_DISK: '70',
    DISK_CHANGE_ERROR: '71'
}



export {
    REQUEST_TYPE,
    RETURN_TYPE,
    RESPONSE_TYPE,
    ERROR_CODE
}