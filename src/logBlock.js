/**
 *
 * @param {object} buffer SPC buffer
 * @param {number} logOffset Offset of the log (from mainHeader)
 * @return {object} Object containing log meta, data and text
 */
export function readLogBlock(buffer, logOffset) {
  const logHeader = {};
  logHeader.size = buffer.readUint32(); //Size of the block in bytes
  logHeader.memorySize = buffer.readUint32(); //Size of the memory rounded up to nearest multiple of 4096
  logHeader.textOffset = buffer.readUint32(); //Offset to Text section
  logHeader.binarySize = buffer.readUint32(); //Size of binary log block
  logHeader.diskArea = buffer.readUint32(); //Size of the disk area
  logHeader.reserved = buffer.readChars(44); //Reserved space
  const logData = buffer.readChars(logHeader.binarySize);
  buffer.offset = logOffset + logHeader.textOffset;
  const logASCII = buffer.readChars(logHeader.size - logHeader.textOffset);
  return { meta: logHeader, data: logData, text: logASCII };
}
