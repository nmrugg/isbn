#!/usr/bin/env node

var isbn = require(require("path").join(__dirname, "..", "isbn.js"));

if (process.argv[2] === "convert") {
    console.log(isbn.hyphenate(isbn.convert(process.argv[3])));
} else if (process.argv[2] === "svg" || process.argv[2] === "gen" || process.argv[2] === "generate" || process.argv[2] === "barcode") {
    console.log(isbn.generate_barcode(process.argv[3]));
} else if (process.argv[2] === "check" || process.argv[2] === "validate") {
    console.log(isbn.validate(process.argv[3]));
} else if (isbn.validate(process.argv[2])) {
    console.log("ISBN 10: " + isbn.hyphenate(isbn.convert(process.argv[2], 10)));
    console.log("ISBN 13: " + isbn.hyphenate(isbn.convert(process.argv[2], 13)));
} else {
    if (process.argv[2]) {
        console.log("Invalid command or ISBN!");
    }
    console.log("");
    console.log("Usage: isbn.js [COMMAND] ISBN");
    console.log("");
    console.log("Commands:");
    console.log("  check     Check to see if an ISBN is valid");
    console.log("  convert   Convert between 10 and 13 ISBN");
    console.log("  generate  Generate an SVG barcode");
    console.log("");
    console.log("If COMMAND is omitted and an ISBN is present,");
    console.log("it will display both the 10 and 13 length ISBNs.");
    console.log("");
}
