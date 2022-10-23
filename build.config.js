const path = require('path');

module.exports = {
    src: path.resolve(__dirname, './src'),
    output: path.resolve(__dirname, './dist'),
    static: path.resolve(__dirname, './public'),
    files: [
        {
            path: 'index.html',
            variables: {
                GAID: process.env.GAID,
            }
        }
    ]
}