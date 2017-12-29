function isException(error) {
    let strError = error.toString();
    console.log(strError);
    return strError.includes('invalid opcode') || strError.includes('invalid JUMP') || strError.includes('VM Exception');
}

function ensureException(error) {
    assert(isException(error), error.toString());
}

module.exports = {
    zeroAddress: '0x0000000000000000000000000000000000000000',
    isException: isException,
    ensureException: ensureException
};