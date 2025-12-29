// Mock for file-type ESM module
module.exports = {
  fileTypeFromBuffer: jest.fn(async (buffer) => {
    // Check for PDF signature
    if (buffer.toString('utf-8', 0, 5) === '%PDF-') {
      return { ext: 'pdf', mime: 'application/pdf' }
    }
    // Return null for unknown types
    return null
  }),
}
